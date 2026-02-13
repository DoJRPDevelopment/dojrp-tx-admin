import { join } from "path";
import ConsoleTransformer from "./ConsoleTransformer";
import { formatDateYYYYMMDD, regexColors, regexControls } from "./fxsLoggerUtils";
import { createWriteStream, WriteStream } from "fs";
import ConsoleLineEnum from "./ConsoleLineEnum";
import { txHostConfig } from "@core/globalData";
import { processStdioWriteRaw } from "@lib/console";
import bytes from "bytes";
import { getLogDivider } from "../loggerUtils";

export default class DojrpFXServerLogger {
    private static readonly FILE_BUFFER_FLUSH_INTERVAL_MS = 5000;
    private static readonly RECENT_BUF_MAX_SIZE = 256 * 1024;
    private static readonly RECENT_BUF_TRIM_SLICE_SIZE = 32 * 1024;

    private readonly transformer = new ConsoleTransformer();
    private readonly logDirPath: string;
    private fileStream: WriteStream | null = null;
    private fileBuffer: string = "";
    private recentBuffer = "";

    constructor(logDirPath: string) {
        this.logDirPath = logDirPath;

        setInterval(() => {
            this.flushFileBuffer();
        }, DojrpFXServerLogger.FILE_BUFFER_FLUSH_INTERVAL_MS);
    }

    private computeLogFilePath(): string {
        const fileName = `${formatDateYYYYMMDD(new Date())}.log`;
        return join(this.logDirPath, fileName);
    }

    private openStreamForFile(path: string): WriteStream {
        return createWriteStream(path, { flags: 'a' });
    }

    private internalFlushBufferToStream(buf: string, stream: WriteStream): void {
        stream.write(buf.replace(regexColors, ""));
    }

    private currentFileStream(): WriteStream {
        const computedFilePath = this.computeLogFilePath();
        
        if (this.fileStream?.path == computedFilePath) {
            return this.fileStream;
        }

        if (null !== this.fileStream) {
            const oldStream = this.fileStream;
            this.fileStream = this.openStreamForFile(computedFilePath);
            
            const bufCopy = this.fileBuffer;
            this.fileBuffer = "";

            this.internalFlushBufferToStream(bufCopy, oldStream);
            
            return this.fileStream;
        }

        this.fileStream = this.openStreamForFile(computedFilePath);
        return this.fileStream;
    }

    private flushFileBuffer(): void {
        const bufCopy = this.fileBuffer;
        this.fileBuffer = "";

        this.internalFlushBufferToStream(bufCopy, this.currentFileStream());
    }

    private appendRecent(data: string): void {
        const maxSize = DojrpFXServerLogger.RECENT_BUF_MAX_SIZE;
        const trimSize = DojrpFXServerLogger.RECENT_BUF_TRIM_SLICE_SIZE;

        this.recentBuffer += data;
        if (this.recentBuffer.length > maxSize) {
            this.recentBuffer = this.recentBuffer.slice(trimSize - maxSize);
            this.recentBuffer = this.recentBuffer.substring(this.recentBuffer.indexOf('\n'));
        }
    }

    private processLine(type: ConsoleLineEnum, data: string, context?: string): void {
        //Process the data
        const {
            webBuffer,
            stdoutBuffer,
            fileBuffer
        } = this.transformer.process(type, data, context);

        //To file
        this.fileBuffer += fileBuffer;

        //For the terminal
        if (!txConfig.server.quiet && !txHostConfig.forceQuietMode) {
            processStdioWriteRaw(stdoutBuffer);
        }

        //For the live console
        txCore.webServer.webSocket.buffer("liveconsole", webBuffer);
        this.appendRecent(webBuffer);
    }

    /**
     * Returns a string with short usage stats
     */
    public getUsageStats(): string {
        return `Buffer: ${bytes(this.recentBuffer.length)}`;
    }


    /**
     * Returns the recent fxserver buffer containing HTML markers, and not XSS escaped.
     * The size of this buffer is usually above 64kb, never above 128kb.
     */
    public getRecentBuffer(): string {
        return this.recentBuffer;
    }


    /**
     * Writes to the log an informational message
     */
    public logInformational(msg: string) {
        this.processLine(ConsoleLineEnum.MarkerInfo, msg + '\n');
    }


    /**
     * Writes to the log that the server is booting
     */
    public logFxserverSpawn(pid: string) {
        //force line skip to create separation
        if (this.recentBuffer.length) {
            const lineBreak = this.transformer.lastEol ? '\n' : '\n\n';
            this.processLine(ConsoleLineEnum.MarkerInfo, lineBreak);
        }
        //need to break line
        const multiline = getLogDivider(`[${pid}] FXServer Starting`);
        for (const line of multiline.split('\n')) {
            if (!line.length) break;
            this.processLine(ConsoleLineEnum.MarkerInfo, line + '\n');
        }
    }


    /**
     * Writes to the log an admin command
     */
    public logAdminCommand(author: string, cmd: string) {
        this.processLine(ConsoleLineEnum.MarkerAdminCmd, cmd + '\n', author);
    }


    /**
     * Writes to the log a system command.
     */
    public logSystemCommand(cmd: string) {
        if(cmd.startsWith('txaEvent "consoleCommand"')) return;
        // if (/^txaEvent \w+ /.test(cmd)) {
        //     const [event, payload] = cmd.substring(9).split(' ', 2);
        //     cmd = chalk.italic(`<broadcasting txAdmin:events:${event}>`);
        // }
        this.processLine(ConsoleLineEnum.MarkerSystemCmd, cmd + '\n');
    }


    /**
     * Handles all stdio data.
     */
    public writeFxsOutput(
        source: ConsoleLineEnum.StdOut | ConsoleLineEnum.StdErr,
        data: string | Buffer
    ) {
        if (typeof data !== 'string') {
            data = data.toString();
        }
        this.processLine(source, data.replace(regexControls, ''));
    }
}
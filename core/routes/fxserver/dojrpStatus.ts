import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { FxMonitorHealth } from '@shared/enums';


/**
 * Returns the DoJRP server status
 */
export default async function FXServerDojrpStatus(ctx: AuthedCtx) {
    const serverStatus = txCore.fxMonitor.status.health;

    if (
        serverStatus === FxMonitorHealth.ONLINE
        || serverStatus === FxMonitorHealth.OFFLINE
        || serverStatus === FxMonitorHealth.PARTIAL
    ) {
        return ctx.send(serverStatus);
    }

    return ctx.send(FxMonitorHealth.OFFLINE);
};

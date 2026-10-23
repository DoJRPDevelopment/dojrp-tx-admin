const modulename = 'WebServer:GetSettingsConfigs';
import { txHostConfig } from '@core/globalData';
import consoleFactory from '@lib/console';
import { redactStartupSecrets } from '@lib/misc';
import ConfigStore from '@modules/ConfigStore';
import { ConfigChangelogEntry } from '@modules/ConfigStore/changelog';
import { PartialTxConfigs, TxConfigs } from '@modules/ConfigStore/schema';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { GenericApiErrorResp } from '@shared/genericApiTypes';
import localeMap from '@shared/localeMap';
const console = consoleFactory(modulename);


export type GetConfigsResp = {
    locales: { code: string, label: string }[],
    dataPath: string,
    hasCustomDataPath: boolean,
    changelog: ConfigChangelogEntry[],
    storedConfigs: PartialTxConfigs,
    defaultConfigs: TxConfigs,
    forceQuietMode: boolean,
}


/**
 * Returns the output page containing the live console
 */
export default async function GetSettingsConfigs(ctx: AuthedCtx) {
    const sendTypedResp = (data: GetConfigsResp | GenericApiErrorResp) => ctx.send(data);

    //Check permissions
    if (!ctx.admin.testPermission('settings.view', modulename)) {
        return sendTypedResp({
            error: 'You do not have permission to view the settings.'
        });
    }

    //Prepare data
    const locales = Object.keys(localeMap).map(code => ({
        code,
        label: localeMap[code].$meta.label,
    }));
    locales.sort((a, b) => a.label.localeCompare(b.label));

    const outData: GetConfigsResp = {
        locales,
        dataPath: txHostConfig.dataPath,
        hasCustomDataPath: txHostConfig.hasCustomDataPath,
        changelog: txCore.configStore.getChangelog(),
        storedConfigs: txCore.configStore.getStoredConfig(),
        defaultConfigs: ConfigStore.SchemaDefaults,
        forceQuietMode: txHostConfig.forceQuietMode,
    };

    //Redact sensitive data if the user doesn't have the write permission
    if (!ctx.admin.hasPermission('settings.write')) {
        const toRedact = outData.storedConfigs as any; //dont want to type this
        if(outData.storedConfigs.server?.startupArgs) {
            toRedact.server.startupArgs = redactStartupSecrets(outData.storedConfigs.server.startupArgs);
        }
        if(outData.storedConfigs.discordBot?.token) {
            toRedact.discordBot.token = '[redacted by txAdmin]';
        }
        if(outData.storedConfigs.discordBot?.serverActionWebhook1) {
            toRedact.discordBot.serverActionWebhook1 = '[redacted by txAdmin]';
        }
        if(outData.storedConfigs.discordBot?.serverActionWebhook2) {
            toRedact.discordBot.serverActionWebhook2 = '[redacted by txAdmin]';
        }
    }

    return sendTypedResp(outData);
};

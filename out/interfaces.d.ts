import * as tmp from 'tmp';
export interface IPackage {
    url: string;
    installPath?: string;
    tmpFile: tmp.SynchronousResult;
}
export interface IConfig {
    downloadFileNames: {
        [platform: string]: string;
    };
    version: string;
    installDirectory: string;
    downloadUrl: string;
    proxy: string;
    strictSSL: boolean;
    executableFiles: Array<string>;
}
export declare const enum Events {
    /**
     * Download start, data will be the size of the download in bytes
     */
    DOWNLOAD_START = "download_start",
    /**
     * Download progress event, data will be the current progress of the download
     */
    DOWNLOAD_PROGRESS = "download_progress",
    /**
     * Download end
     */
    DOWNLOAD_END = "download_end",
    /**
     * Install Start
     */
    INSTALL_START = "install_start",
    /**
     * Install End
     */
    INSTALL_END = "install_end",
}

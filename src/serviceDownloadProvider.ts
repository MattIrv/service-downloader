/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
import * as path from 'path';
import * as fs from 'fs';
import * as decompress from 'decompress';

import { Runtime, getRuntimeDisplayName } from './platform'
import { IConfig, IPackage } from './interfaces';
import { ILogger } from './interfaces';
import * as tmp from 'tmp';
import HttpClient from './httpClient';

/*
* Service Download Provider class which handles downloading the service client
*/
export default class ServiceDownloadProvider {

    private httpClient = new HttpClient();

	constructor(private _config: IConfig,
		private _fromBuild: boolean,
		private _logger?: ILogger) {
		// Ensure our temp files get cleaned up in case of error.
		tmp.setGracefulCleanup();
	}

	/**
	 * Returns the download url for given platform
	 */
	public getDownloadFileName(platform: Runtime): string {
		let fileNamesJson = this._config.downloadFileNames;
		console.info('Platform: ', platform.toString());

		let fileName = fileNamesJson[platform.toString()];
		console.info('Filename: ', fileName);

		if (fileName === undefined) {
			if (process.platform === 'linux') {
				throw new Error('Unsupported linux distribution');
			} else {
				throw new Error(`Unsupported platform: ${process.platform}`);
			}
		}

		return fileName;
	}


	/**
	 * Returns SQL tools service installed folder.
	 */
	public getInstallDirectory(platform: Runtime): string {
		let basePath = this.getInstallDirectoryRoot(platform);
		let versionFromConfig = this._config.version;
		basePath = basePath.replace('{#version#}', versionFromConfig);
		basePath = basePath.replace('{#platform#}', getRuntimeDisplayName(platform));
		if (!fs.existsSync(basePath)) {
			fs.mkdirSync(basePath);
		}

		return basePath;
	}

	private getLocalUserFolderPath(platform: Runtime): string {
		if (platform) {
			switch (platform) {
				case Runtime.Windows_64:
				case Runtime.Windows_86:
					return process.env.APPDATA;
				case Runtime.OSX:
					return process.env.HOME + '/Library/Preferences';
				default:
					return process.env.HOME;
			}
		}
	}

	/**
	 * Returns SQL tools service installed folder root.
	 */
	public getInstallDirectoryRoot(platform: Runtime): string {
		let installDirFromConfig = this._config.installDirectoy;
		if (!installDirFromConfig || installDirFromConfig === '') {
			let rootFolderName: string = '.sqlops';
			if (platform === Runtime.Windows_64 || platform === Runtime.Windows_86) {
				rootFolderName = 'sqlops';
			}
			// installDirFromConfig = path.join(this.getLocalUserFolderPath(platform), `/${rootFolderName}/${this._extensionConstants.installFolderName}/{#version#}/{#platform#}`);
		}
		return installDirFromConfig;
	}

	private getGetDownloadUrl(fileName: string): string {
		let baseDownloadUrl = this._config.downloadUrl;
		let version = this._config.version;
		baseDownloadUrl = baseDownloadUrl.replace('{#version#}', version);
		baseDownloadUrl = baseDownloadUrl.replace('{#fileName#}', fileName);
		return baseDownloadUrl;
	}

	/**
	 * Downloads the service and decompress it in the install folder.
	 */
	public installService(platform: Runtime): Promise<boolean> {
		const proxy = this._config.proxy;
		const strictSSL = this._config.strictSSL;

		return new Promise<boolean>((resolve, reject) => {
			const fileName = this.getDownloadFileName(platform);
			const installDirectory = this.getInstallDirectory(platform);

			// this._logger.appendLine(`${this._extensionConstants.serviceInstallingTo} ${installDirectory}.`);
			const urlString = this.getGetDownloadUrl(fileName);

			// this._logger.appendLine(`${Constants.serviceDownloading} ${urlString}`);
			let pkg: IPackage = {
				installPath: installDirectory,
				url: urlString,
				tmpFile: undefined
			};
			this.createTempFile(pkg).then(tmpResult => {
				pkg.tmpFile = tmpResult;

				this.httpClient.downloadFile(pkg.url, pkg, this._logger, proxy, strictSSL).then(_ => {

					// this._logger.logDebug(`Downloaded to ${pkg.tmpFile.name}...`);
					this._logger.appendLine(' Done!');
					this.install(pkg).then(result => {
						resolve(true);
					}).catch(installError => {
						reject(installError);
					});
				}).catch(downloadError => {
					this._logger.appendLine(`[ERROR] ${downloadError}`);
					reject(downloadError);
				});
			});
		});
	}

	private createTempFile(pkg: IPackage): Promise<tmp.SynchronousResult> {
		return new Promise<tmp.SynchronousResult>((resolve, reject) => {
			tmp.file({ prefix: 'package-' }, (err, path, fd, cleanupCallback) => {
				if (err) {
					return reject(new Error('Error from tmp.file'));
				}

				resolve(<tmp.SynchronousResult>{ name: path, fd: fd, removeCallback: cleanupCallback });
			});
		});
	}

	private install(pkg: IPackage): Promise<void> {
		this._logger.appendLine('Installing ...');

		return decompress(pkg.tmpFile.name, pkg.installPath);
	}
}



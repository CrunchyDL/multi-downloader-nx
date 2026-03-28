// Helper functions
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import childProcess from 'child_process';
import { console } from './log';

export default class Helper {
	static async question(q: string) {
		const rl = readline.createInterface({ input, output });
		const a = await rl.question(q);
		rl.close();
		return a;
	}
	static formatTime(t: number) {
		const days = Math.floor(t / 86400);
		const hours = Math.floor((t % 86400) / 3600);
		const minutes = Math.floor(((t % 86400) % 3600) / 60);
		const seconds = +(t % 60).toFixed(0);
		const daysS = days > 0 ? `${days}d` : '';
		const hoursS = daysS || hours ? `${daysS}${daysS && hours < 10 ? '0' : ''}${hours}h` : '';
		const minutesS = minutes || hoursS ? `${hoursS}${hoursS && minutes < 10 ? '0' : ''}${minutes}m` : '';
		const secondsS = `${minutesS}${minutesS && seconds < 10 ? '0' : ''}${seconds}s`;
		return secondsS;
	}

	static cleanupFilename(n: string) {
		/* eslint-disable no-useless-escape, no-control-regex */
		// Smart Replacer
		const rep: Record<string, string> = {
			'/': '_',
			'\\': '_',
			':': '_',
			'*': '∗',
			'?': '？',
			'"': "'",
			'<': '‹',
			'>': '›',
			'|': '_'
		};
		n = n.replace(/[\/\\:\*\?"<>\|]/g, (ch) => rep[ch] || '_');

		// Old Replacer
		const controlRe = /[\x00-\x1f\x80-\x9f]/g;
		const reservedRe = /^\.+$/;
		const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
		const windowsTrailingRe = /[\. ]+$/;

		return n.replace(controlRe, '_').replace(reservedRe, '_').replace(windowsReservedRe, '_').replace(windowsTrailingRe, '_');
	}

	static exec(
		pname: string,
		fpath: string,
		pargs: string,
		spc = false
	): Promise<{ isOk: true } | { isOk: false; err: Error & { code: number } }> {
		const fullCommand = pargs ? ' ' + pargs : '';
		console.info(`\n> "${pname}"${fullCommand}${spc ? '\n' : ''}`);
		
		return new Promise((resolve) => {
			const options: any = { 
				stdio: ['ignore', 'pipe', 'pipe'],
				windowsHide: true
			};
			
			let child: childProcess.ChildProcess;
			child = childProcess.spawn(fpath, pargs ? splitArgs(pargs) : [], options);

			child.stdout?.on('data', (data) => {
				process.stdout.write(data);
			});

			child.stderr?.on('data', (data) => {
				process.stderr.write(data);
			});

			let resolved = false;
			const handleExit = (code: number | null) => {
				if (resolved) return;
				resolved = true;
				if (code === 0 || (pname === 'mkvmerge' && code === 1)) {
					resolve({ isOk: true });
				} else {
					const error = new Error(`${pname} exited with code ${code}`) as any;
					error.code = code;
					resolve({ isOk: false, err: error });
				}
			};

			child.on('exit', handleExit);
			child.on('close', handleExit);

			child.on('error', (err) => {
				if (resolved) return;
				resolved = true;
				resolve({ isOk: false, err: err as any });
			});
		});
	}
}

function splitArgs(args: string): string[] {
	const regex = /("[^"]*"|'[^']*'|[^'"\s]+)+/g;
	const matches = args.match(regex);
	if (!matches) return [];
	return matches.map(arg => arg.replace(/["'](.*?)["']/g, '$1'));
}

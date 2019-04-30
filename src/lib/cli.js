// CLI setup

import program from 'commander';
import shell from 'shelljs';
import updateNotifier from 'update-notifier';
import winston from 'winston';
import pkg from '../../package.json';
import {
  validateGCloud, validateSettings, validateMeteor, validateApp, getDocker,
} from './validation';
import compileBundle from './bundle';
import AppEngineInstance from './google';

// Notify user of available updates
updateNotifier({ pkg }).notify();

// Configure CLI
program
  .description(pkg.description)
  .version(`v${pkg.version}`, '-v, --version')
  .option('-s, --settings <path>', 'path to settings file (settings.json)', '../examples/settings.json')
  .option('-c, --app <path>', 'path to app.yaml config file')
  .option('-d, --docker <path>', 'path to Dockerfile fle', '../examples/Dockerfile')
  .option('-v, --verbose', 'enable verbose mode')
  .option('-q, --quiet', 'enable quite mode')
  .parse(process.argv);

// Pretty print logs
winston.cli();

// Terminate on shelljs errors
shell.config.fatal = true;

// Toggle Quiet mode based on user preference
if (program.quiet === true) {
  winston.level = 'error';
  shell.config.silent = true;
}

// Toggle Debug mode based on user preference
if (program.verbose === true) {
  winston.level = 'debug';
}

export default async function startup() {
  try {
    // Validate if gcloud is installed
    validateGCloud();

    // Validate Meteor version/packages
    validateMeteor();

    // Validate settings file(s)
    const settingsFile = validateSettings(program.settings);
    const appFile = validateApp(program.app);
    const dockerFile = getDocker(program.docker);

    // Create Meteor bundle
    compileBundle();

    // Set up GCP App Engine instance
    const appEngine = new AppEngineInstance({ settingsFile, appFile, dockerFile });
    appEngine.prepareBundle();
    appEngine.deployBundle();
  } catch (error) {
    winston.error(error.message);
    process.exit(1);
  }
}

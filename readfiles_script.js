const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Congratulations, your extension "auto-conda-runner" is now active!');

    // Register a command to run the conda command
    let disposable = vscode.commands.registerCommand('extension.runCondaCommand', function () {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            const folderPath = folders[0].uri.fsPath;

            // Read folder contents
            fs.readdir(folderPath, (err, files) => {
                if (err) {
                    vscode.window.showErrorMessage('Failed to read folder contents');
                    return;
                }

                // Example: Print the files
                console.log('Files in the folder:', files);

                // Run a Conda command
                const condaCommand = 'conda list'; // Replace with your conda command
                exec(condaCommand, (err, stdout, stderr) => {
                    if (err) {
                        vscode.window.showErrorMessage(`Conda command failed: ${stderr}`);
                        return;
                    }
                    vscode.window.showInformationMessage(`Conda command output: ${stdout}`);
                });
            });
        } else {
            vscode.window.showErrorMessage('No folder is open');
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};

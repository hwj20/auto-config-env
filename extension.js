try {
  const openai = require('openai');
} catch (err) {
  console.error("Failed to load 'openai' module:", err);
}

const vscode = require('vscode');
const {executeRunPythonAndHandleErrors,testpython,getCondaEnvironments,getPythonVersion} = require('./utils/runPythonFileUtils')
const {generateRequirements,getPackageAndInstall} = require('./utils/createRequirementUtils')
const {completeImports} = require('./utils/addImportsUtils')
const { exec } = require('child_process');


let selectedCondaEnv = 'base';
let selectedPythonVersion = '';
let statusBarItem;
let isPythonVersionValid = false;


async function createNewCondaEnv() {
    const envName = await vscode.window.showInputBox({
        prompt: 'Enter name for new Conda environment',
        placeHolder: 'my_new_env'
    });

    if (!envName) {
        vscode.window.showErrorMessage('Environment name is required to create a new Conda environment.');
        return null;
    }

    const pythonVersion = await vscode.window.showQuickPick(
        ['3.6', '3.7', '3.8', '3.9', '3.10','3.11','3.12'],
        { placeHolder: 'Select Python version for the new environment' }
    );

    if (!pythonVersion) {
        vscode.window.showErrorMessage('Python version is required to create a new Conda environment.');
        return null;
    }

    try {
        await new Promise((resolve, reject) => {
            exec(`conda create -n ${envName} python=${pythonVersion} -y`, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            });
        });
        vscode.window.showInformationMessage(`Conda environment '${envName}' created successfully.`);
        return envName;
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create Conda environment: ${error}`);
        return null;
    }
}


async function updateStatusBar() {
    try{
        const pythonVersion = await getPythonVersion(selectedCondaEnv);
        selectedPythonVersion = pythonVersion;
        statusBarItem.text = `$(database) ${selectedCondaEnv} (Python ${pythonVersion})`;
        statusBarItem.show();
        isPythonVersionValid = true;
    }catch(error){
        statusBarItem.text = `$(database) ${selectedCondaEnv} (Python version not found)`;
        statusBarItem.show();
        isPythonVersionValid = false;
    }
}

async function selectCondaEnv() {
    let condaEnvironments = await getCondaEnvironments();
    condaEnvironments.push('Create new environment...');

    const selectedEnv = await vscode.window.showQuickPick(condaEnvironments, {
        placeHolder: 'Select Conda Environment',
    });

    if (selectedEnv === 'Create new environment...') {
        const newEnvName = await createNewCondaEnv();
        if (newEnvName) {
            selectedCondaEnv = newEnvName;
            await updateStatusBar();
        }
    } else if (selectedEnv) {
        selectedCondaEnv = selectedEnv;
        await updateStatusBar();
    }
}


async function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'auto_config_env.selectCondaEnv';
    context.subscriptions.push(statusBarItem);
    await updateStatusBar();
    


    let disposableSelectCondaEnv = vscode.commands.registerCommand('auto_config_env.selectCondaEnv', selectCondaEnv);
    context.subscriptions.push(disposableSelectCondaEnv);

    let disposableAutoConfig = vscode.commands.registerCommand('auto_config_env.autoConfig', async() => {
        if (isPythonVersionValid) {
            try{
                await getPackageAndInstall(selectedPythonVersion,selectedCondaEnv);
                
                const userChoice = await vscode.window.showQuickPick(
                    ['Yes', 'No'], 
                    {
                        placeHolder: 'Config Finished. Do you wish to run the program?',
                        canPickMany: false
                    }
                );
                // const userChoice = await showCustomMessageBox(context, 'Do you want to run the program?');

                // const userChoice = await vscode.window.showInformationMessage(
                //     'Do you want to run the program?',
                //     { modal: true },
                //     'Yes',
                //     'No'
                // );

                if (userChoice === 'Yes') {
                    await executeRunPythonAndHandleErrors(3, selectedCondaEnv); // 设置循环次数为3次，并指定conda环境
                } else {
                    vscode.window.showInformationMessage('Program execution cancelled.');
                }
                
            }
            catch(error){
                vscode.window.showErrorMessage('Error:'+ error);
            }
        } else {
            await selectCondaEnv();
            vscode.window.showErrorMessage('Cannot run Python script: Python version not found for the selected Conda environment.');
        }
    });


    let disposableRunPython = vscode.commands.registerCommand('auto_config_env.runPythonAndHandleErrors', async() => {
        if (isPythonVersionValid) {
            await executeRunPythonAndHandleErrors(3, selectedCondaEnv); // 设置循环次数为3次，并指定conda环境
        } else {
            await selectCondaEnv();
            vscode.window.showErrorMessage('Cannot run Python script: Python version not found for the selected Conda environment.');
        }
    });

    let disposableCompleteImports = vscode.commands.registerCommand('auto_config_env.completeImports', completeImports);

    let disposableGenerateRequirements = vscode.commands.registerCommand('auto_config_env.generateRequirements', async (uri) => {
        if (uri) {
            const folderPath = uri.fsPath;
            await generateRequirements(folderPath,selectedPythonVersion);
        } else {
            vscode.window.showErrorMessage('No folder selected');
        }
    });
     

    context.subscriptions.push(disposableRunPython);
    context.subscriptions.push(disposableCompleteImports);
    context.subscriptions.push(disposableGenerateRequirements);
    context.subscriptions.push(disposableAutoConfig);
    


}




function deactivate() {}

module.exports = {
    activate,
    deactivate,
};

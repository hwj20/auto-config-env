const { OpenAI } = require('openai');
const { exec } = require('child_process');
const vscode = require('vscode');
const {loadConfig} = require('./configUtils')

config = loadConfig();
const openai = new OpenAI({
  apiKey:  config.api_key,
});

function runPythonFile(filePath,condaEnv="base") {
    return new Promise((resolve, reject) => {
        exec(`conda run -n ${condaEnv} python ${filePath}`, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function handleError(error) {
    try {
        const prompt_get_cmd = "As an experienced Python programming expert, highly skilled at solving programming environment configuration issues, please provide a solution in Ubuntu system for the given programming environment configuration problem.\
         Note: sudo command cannot be used.The given programming environment configuration problem is: {question}Please write programming commands that can solve the above problems. \
         Respond only with a string in the following JSON format:{{\"commands\": output string}}"+error;
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-1106', // 或 'gpt-4' 如果你有访问权限
            messages: [{role: "user", content: prompt_get_cmd}],
        });
        cmd =  JSON.parse(response.choices[0].message.content).commands
        return cmd;
    } catch (err) {
        vscode.window.showErrorMessage('Error communicating with OpenAI: ' + err);
        throw err;
    }
}

function runCommand(command,condaEnv="base") {
    return new Promise((resolve, reject) => {
        exec(`conda run -n ${condaEnv} ${command}`, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function executeRunPythonAndHandleErrors(maxRetries = 3,condaEnv) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const filePath = editor.document.fileName;
    if (!filePath.endsWith('.py')) {
        vscode.window.showErrorMessage('The active file is not a Python file');
        return;
    }

    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            const res =  await runPythonFile(filePath,condaEnv);
            vscode.window.showInformationMessage('Python script ran successfully.'+res);
            return;
        } catch (error) {
            vscode.window.showErrorMessage(`Attempt ${attempts + 1} failed: ${error}`);
            attempts += 1;

            if (attempts >= maxRetries) {
                vscode.window.showErrorMessage('Max retries reached. Stopping.');
                return;
            }

            try {
                const command = await handleError(error);
                vscode.window.showInformationMessage(`Received command from OpenAI: ${command}`);
                const output = await runCommand(command,condaEnv);
                vscode.window.showInformationMessage(`Command output: ${output}`);
            } catch (err) {
                vscode.window.showErrorMessage(`Error handling command: ${err}`);
                return;
            }
        }
    }
}

async function testpython(){
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const filePath = editor.document.fileName;
    if (!filePath.endsWith('.py')) {
        vscode.window.showErrorMessage('The active file is not a Python file');
        return;
    }
        try {
            const res = await runPythonFile(filePath,"base");
            vscode.window.showInformationMessage('Python script ran successfully.'+res);
            return;
        } catch (error) {
            vscode.window.showErrorMessage(`failed: ${error}`);
        }
}
async function getCondaEnvironments() {
    return new Promise((resolve, reject) => {
        exec('conda env list', (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                const envs = stdout.split('\n')
                    .filter(line => line.includes(' '))  // Filter lines with spaces
                    .map(line => line.split(' ')[0])     // Get the environment name
                    .filter(element => !element.includes("#")) // Remove #
                    .filter(env => env);                 // Remove empty lines
                resolve(envs);
            }
        });
    });
}

async function getPythonVersion(condaEnv) {
    console.log(condaEnv);
    return new Promise((resolve, reject) => {
        exec(`conda run -n ${condaEnv} python --version`, (error, stdout, stderr) => {
            if (error) {
                // vscode.window.showErrorMessage(`Python not found on env "${condaEnv}"`);
                reject(stderr);
            } else {
                const version = stdout || stderr; // python --version output can be in stdout or stderr
                resolve(version.trim().split(' ')[1]);
            }
        });
    });
}


module.exports = {
    executeRunPythonAndHandleErrors,
    testpython,
    getCondaEnvironments,
    getPythonVersion
}
const vscode = require('vscode');
const { OpenAI } = require('openai');
const {loadConfig} = require('./configUtils')
const fs = require('fs');
const path = require('path');

config = loadConfig();
const openai = new OpenAI({
  apiKey:  config.api_key,
});

function getAllPythonFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllPythonFiles(dirPath + "/" + file, arrayOfFiles);
        } else if (file.endsWith('.py')) {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

async function generateRequirements(dirPath) {
    const folder = vscode.workspace.workspaceFolders;
    if (!folder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    // const dirPath = folder[0].uri.fsPath;
    const pythonFiles = getAllPythonFiles(dirPath);

    if (pythonFiles.length === 0) {
        vscode.window.showErrorMessage('No Python files found in the workspace');
        return;
    }

    let combinedContent = '';
    pythonFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        combinedContent += `\n\n# File: ${file}\n${content}`;
    });

    const prompt_get_requirements = "As an experienced Python programming expert proficient in solving programming environment configuration issues, please help me set up a specified programming environment on an Ubuntu system. I have lost the Python project's requirements.txt file but can provide the content of all Python files in the project as strings. Based on the import statements and other possible clues in these files, help me identify the external libraries the project depends on and create a requirements.txt file that will allow the project to run smoothly. Please try to identify and provide specific library version requirements; if it's not possible to determine the exact versions, at least provide the names of the libraries. Note that Python's standard library is pre-installed, so there's no need to list modules from the standard library. Here is the content of my project files:{project} \
Respond only with a string in the following JSON format: \
{{\"requirement\": output string}}"+combinedContent;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-1106', // 或 'gpt-4' 如果你有访问权限
            messages: [{role: "user", content: prompt_get_requirements}],
        });
        const requirementsContent =  JSON.parse(response.choices[0].message.content).requirement
        const requirementsPath = path.join(dirPath, 'requirements.txt');
        fs.writeFileSync(requirementsPath, requirementsContent);

        vscode.window.showInformationMessage('requirements.txt generated successfully.');
    } catch (err) {
        vscode.window.showErrorMessage('Error communicating with OpenAI: ' + err);
        throw err;
    }
}

module.exports = {
    generateRequirements,
};

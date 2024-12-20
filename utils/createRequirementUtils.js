const vscode = require('vscode');
const { OpenAI } = require('openai');
// const {loadConfig} = require('./configUtils')
// config = loadConfig();
const fs = require('fs');
const path = require('path');
const {runCommand} = require('./runPythonFileUtils')

const gpt_model =  vscode.workspace.getConfiguration('auto_config_env').get('gpt_model');
const apiKey = vscode.workspace.getConfiguration('auto_config_env').get('openaiApiKey');
if (!apiKey) {
    throw new Error("API Key is not configured in settings.json");
}
const openai = new OpenAI({
  apiKey:  apiKey,
});



function getAllPythonFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(function(file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllPythonFiles(fullPath, arrayOfFiles);
        } else if (file.endsWith('.py') || file === 'pyproject.toml' || file.includes('requirement')) {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}
function extractImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importStatements = content.match(/^\s*(import\s+\w+|from\s+\w+\s+import\s+\w+)/gm);
    return importStatements ? importStatements.join('\n') : '';
}

async function getPackageAndInstall(pythonVersion,condaEnv){
    const folder = vscode.workspace.workspaceFolders;

    if (!folder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    const dirPath = folder[0].uri.fsPath;
    const pythonFiles = getAllPythonFiles(dirPath);
    if (pythonFiles.length === 0) {
        vscode.window.showErrorMessage('No Python files found in the workspace');
        return;
    }

    // let combinedContent = '';
    // pythonFiles.forEach(file => {
    //     const content = fs.readFileSync(file, 'utf8');
    //     combinedContent += `\n\n# File: ${file}\n${content}`;
    // });

    let combinedContent = '';
    pythonFiles.forEach(file => {
        if (file.endsWith('py')){
            const imports = extractImports(file);
            combinedContent += `\n\n# File: ${file}\n${imports}`;
        }
        else{
            
            const content = fs.readFileSync(file, 'utf8');
            combinedContent += `\n\n# File: ${file}\n${content}`;
        }
    });

    if (combinedContent.trim() === '') {
        vscode.window.showErrorMessage('No import statements found in Python files');
        return;
    }
    const prompt_get_requirements = `As an experienced Python programming expert proficient in solving programming environment configuration issues, please help me set up a specified programming environment on an Ubuntu system. I have lost the Python project's requirements.txt file but can provide the content of all Python files in the project as strings. Based on the import statements and other possible clues in these files, help me identify the external libraries the project depends on and create a requirements.txt file that will allow the project to run smoothly. Please try to identify and provide specific library version requirements; if it's not possible to determine the exact versions, at least provide the names of the libraries. Note that Python's standard library is pre-installed, so there's no need to list modules from the standard library. Here is the content of my project files:${combinedContent} \
Respond only with a string in the following JSON format: \
{\"requirements_txt\": output string(without version)}
Do not include explanations, comments, or any other text in the output.
`;
// `The python version is ${pythonVersion}`;
    try {
        const response = await openai.chat.completions.create({
            model: gpt_model, // 或 'gpt-4' 如果你有访问权限
            messages: [{role: "user", content: prompt_get_requirements}],
        });
        rawOutput = response.choices[0].message.content;
        // 使用正则表达式提取 JSON 部分
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Invalid JSON format in the response.");
        }
        const requirementsContent =  JSON.parse(jsonMatch[0]).requirements_txt;

        if (requirementsContent == null){
            vscode.window.showInformationMessage("No packages need to install");
            return;
        }
        
        try{
            const packages = requirementsContent.split(/\s+/);
            for (const package of packages) {
                // console.log(item);
                vscode.window.showInformationMessage('Installing package: '+'pip install '+package);
                runCommand('pip install '+package,condaEnv);
            }
            vscode.window.showInformationMessage("get packages "+requirementsContent);
        } catch(err){
            vscode.window.showErrorMessage('Error Installing pacakge ' + err);
        }
    } catch (err) {
        vscode.window.showErrorMessage('Error communicating with OpenAI: ' + err);
        throw err;
    }
}

async function generateRequirements(dirPath, pythonVersion) {
    // const dirPath = folder[0].uri.fsPath;
    const pythonFiles = getAllPythonFiles(dirPath);

    if (pythonFiles.length === 0) {
        vscode.window.showErrorMessage('No Python files found in the workspace');
        return;
    }

    // let combinedContent = '';
    // pythonFiles.forEach(file => {
    //     const content = fs.readFileSync(file, 'utf8');
    //     combinedContent += `\n\n# File: ${file}\n${content}`;
    // });

    let combinedContent = '';
    pythonFiles.forEach(file => {
        if (file.endsWith('py')){
            const imports = extractImports(file);
            combinedContent += `\n\n# File: ${file}\n${imports}`;
        }
        else{
            const content = fs.readFileSync(file, 'utf8');
            combinedContent += `\n\n# File: ${file}\n${content}`;
        }
    });

    if (combinedContent.trim() === '') {
        vscode.window.showErrorMessage('No import statements found in Python files');
        return;
    }
    const prompt_get_requirements = `As an experienced Python programming expert proficient in solving programming environment configuration issues, please help me set up a specified programming environment on an Ubuntu system. I have lost the Python project's requirements.txt file but can provide the content of all Python files in the project as strings. Based on the import statements and other possible clues in these files, help me identify the external libraries the project depends on and create a requirements.txt file that will allow the project to run smoothly. Please try to identify and provide specific library version requirements; if it's not possible to determine the exact versions, at least provide the names of the libraries. Note that Python's standard library is pre-installed, so there's no need to list modules from the standard library. Here is the content of my project files:${combinedContent} \
Respond only with a string in the following JSON format: \
{\"requirements_txt\": output string(without version)}
Do not include explanations, comments, or any other text in the output.
`;
// `The python version is ${pythonVersion}`;

    try {
        const response = await openai.chat.completions.create({
            model: gpt_model, // 或 'gpt-4' 如果你有访问权限
            messages: [{role: "user", content: prompt_get_requirements}],
        });
        rawOutput = response.choices[0].message.content;
        // 使用正则表达式提取 JSON 部分
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Invalid JSON format in the response.");
        }
        const requirementsContent =  JSON.parse(jsonMatch[0]).requirements_txt;
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
    getPackageAndInstall
};

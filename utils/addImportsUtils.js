const vscode = require('vscode');
const { OpenAI } = require('openai');
// const {loadConfig} = require('./configUtils')

// config = loadConfig();
const apiKey = vscode.workspace.getConfiguration('auto_config_env').get('openaiApiKey');

if (!apiKey) {
    throw new Error("API Key is not configured in settings.json");
}


const openai = new OpenAI({
  apiKey:  apiKey,
});

async function completeImports() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const document = editor.document;
    const filePath = document.fileName;
    if (!filePath.endsWith('.py')) {
        vscode.window.showErrorMessage('The active file is not a Python file');
        return;
    }

    const fileContent = document.getText();
    const prompt_get_imports = `As an experienced Python programming expert specializing in resolving programming environment configuration issues, I've encountered a situation where the initial import statements in a Python file have been lost. The remaining content of the Python file is provided to you as a string. Your task is to deduce and compose the necessary import statements required for the successful execution of the file based on the clues within the remaining content. Here is the content of my Python file: ${fileContent} \
Respond only with a string in the following JSON format: \
{\"import_statements\": output string}`

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-1106', // 或 'gpt-4' 如果你有访问权限
            messages: [{role: "user", content: prompt_get_imports}],
        });
        const importStatements =  JSON.parse(response.choices[0].message.content).import_statements

        const updatedContent = `${importStatements}\n\n${fileContent}`;

        const edit = new vscode.WorkspaceEdit();
        const startPosition = new vscode.Position(0, 0);
        const endPosition = new vscode.Position(document.lineCount, 0);
        const range = new vscode.Range(startPosition, endPosition);
        edit.replace(document.uri, range, updatedContent);
        await vscode.workspace.applyEdit(edit);
        await document.save();

        vscode.window.showInformationMessage('Imports completed and added to the file.');
    } catch (err) {
        vscode.window.showErrorMessage('Error communicating with OpenAI: ' + err);
        throw err;
    }
}

module.exports = {
    completeImports,
};

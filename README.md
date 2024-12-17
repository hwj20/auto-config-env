# auto-config-env 

## IMPORTANT
This plugin uses pip to install packages within a Conda environment, defaulting to the *base* environment. 
After the plugin is deployed, please select the corresponding Conda environment or create a new environment from the bottom-right corner.
## Features
1. Complete Imports: Completes imports in a single Python file.
2. Auto Config:  Utilizes a large language model to automatically install Python packages with pip.
3. Environment Debug: Automatically runs the Python file. If errors occur, the large language model suggests how to set up the environment and executes the returned commands. The debug loop runs up to 3 times.
4. Generate requirements.txt (Explore Folder). **Warning**: This operation will generate and **replace** the `requirements.txt` file in the selected folder for `.py` files in all subdirectories.

<!-- 
Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example, if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.
-->

## Deploy
```sh
git clone <repository-url>
cd <project-directory>
npm install 
code .
```

run it with F5 in vscode.



## Requirements
- OpenAI key
- Conda

## Configuration
Add a `.autoconfig-config` file in the root directory with the following content in JSON format:

```json
{
    "api_key": "Your OpenAI Key"
}
```

## Notes
- The extension has not been tested on Windows, so there might be some bugs there.



## Extension Settings

Not yet.

<!-- Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something. -->

## Known Issues


Let me know if there's anything else you'd like to add or change!

<!-- ## Release Notes -->


## TODO
<!-- Json {"id","header","filename","去掉header的code",project:"[path]content\n\n\n [path]|content"} -->

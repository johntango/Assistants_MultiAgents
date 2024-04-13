
import fs from 'fs';
import { get } from 'http';

const write_assistant_function = async (name, instructions) => {

    let text = `
    import OpenAI from 'openai';
    import fs from 'fs';
    import { get } from 'http';
    import { run_named_assistant } from '../run_named_assistant.js';

    const execute = async (name, instructions) => {
        let message = await run_named_assistant("${name}", instructions);
        return message;
    }

    const details = {
        "name": "${name}",
        "parameters": {
        "type": "object",
        "properties": {
            "name": {
            "type": "string",
            "description": "The name of the assistant. eg writer"
            },
            "instructions": {
            "type": "string",
            "description": "The instructions to the assistant. eg Write a story about a dog"
            }
        },
        "required": [
            "name",
            "instructions"
        ]
        },
        "description": "This is a ${name} assistant that follows instructions"
    }
    export { execute, details }; `

    // write a file with the name of the assistant
    fs.writeFile(`functions/${name}.js`, text, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
    return `The ${name} assistant has been created.`
}
export { write_assistant_function };
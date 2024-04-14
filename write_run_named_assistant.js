// this is the function that runs the writer assistant
import OpenAI from 'openai';
import fs from 'fs';
import { get } from 'http';

const run_named_assistant = async (name, instructions) => {
    // this puts a message onto a thread and then runs the assistant on that thread
    let assistant_id;
    let run_id;
    let messages = [];
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // get a new thread to operate on
    let thread = await openai.beta.threads.create()
    let thread_id = thread.id;

    // get assistant id
    const response = await openai.beta.assistants.list({
        order: "desc",
        limit: 10,
    })
    // loop over all assistants and find the one with the name name
    for (let obj in response.data) {
        let assistant = response.data[obj];
        // change assistant.name to small letters
        if (assistant.name.toLowerCase() == name) {
            assistant_id = assistant.id;
            break
        }
    }


    async function runAssistant(assistant_id, thread_id, user_instructions) {
        try {
            await openai.beta.threads.messages.create(thread_id,
                {
                    role: "user",
                    content: user_instructions,
                })
            let run = await openai.beta.threads.runs.create(thread_id, {
                assistant_id: assistant_id
            })
            run_id = run.id;
            get_run_status(thread_id, run_id, messages);
            let message = await openai.beta.threads.messages.list(thread_id)
            await addLastMessagetoArray(message, messages)
        }
        catch (error) {
            console.log(error);
            return error;
        }
    }
    async function get_run_status(thread_id, run_id, messages) {
        try {
            let runStatus = await openai.beta.threads.runs.retrieve(thread_id, run_id);
            while (runStatus.status !== 'completed') {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 1 second
                runStatus = await openai.beta.threads.runs.retrieve(thread_id, run_id);
            }

            //await openai.beta.threads.del(thread_id)
        }
        catch (error) {
            console.log(error);
            return error;
        }
    }
    async function addLastMessagetoArray(message, messages) {
        messages.push(message.data[0].content[0].text.value)
        console.log("PRINTING MESSAGES: ");
        console.log(message.data[0].content[0].text.value)
    }

    await runAssistant(assistant_id, thread_id, instructions);
    // delete the thread

    return messages;
}
const write_assistant_function = async (name, instructions) => {

    let text = `
    import OpenAI from 'openai';
    import fs from 'fs';
    import { get } from 'http';
    import { run_named_assistant } from '../write_run_named_assistant.js';

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
            "description": "The name of the tool. eg writer"
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
const write_tool_function = async (toolname, thefunc) => {

    let text = `
    ${thefunc}
    
    const details = {
        "name": "${toolname}",
        "parameters": {
        "type": "object",
        "properties": {
            "name": {
            "type": "string",
            "description": "The name of the tool. eg writer"
            },
            "instructions": {
            "type": "string",
            "description": "The task for the tool. eg add this sequence of numbers together"
            }
        },
        "required": [
            "name",
            "instructions"
        ]
        },
        "description": "This is a ${toolname} that executes a given task"
    }
    export { execute, details }; `

    // write a file with the name of the assistant
    fs.writeFile(`functions/${toolname}.js`, text, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
    console.log( `The ${toolname} tool has been created.`);
}
export { run_named_assistant, write_assistant_function, write_tool_function};
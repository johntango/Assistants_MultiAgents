// this is the function that runs the writer assistant
import OpenAI from 'openai';
import fs from 'fs';
import { get } from 'http';

const execute = async (name, instructions) => {
// this puts a message onto a thread and then runs the assistant on that thread
    let assistant_id;
    let run_id;
    let messages = [];
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    let thread = await openai.beta.threads.create()
    let thread_id = thread.id;
    const response = await openai.beta.assistants.list({
        order: "desc",
        limit: 10,
    })
    // loop over all assistants and find the one with the name name
    for(let obj in response.data){
        let assistant = response.data[obj];
        // change assistant.name to small letters
        if(assistant.name.toLowerCase() == name){
            assistant_id = assistant.id;
            break
        }
    }

    async function runAssistant(assistant_id, thread_id, user_instructions){
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
            await get_run_status(thread_id, run_id);
            let message = await openai.beta.threads.messages.list(thread_id)
            addLastMessagetoArray(message, messages)
        }
        catch (error) {
            console.log(error);
            return error;
        }
    }
    async function get_run_status(thread_id, run_id) {
        try {
            let runStatus = await openai.beta.threads.runs.retrieve(thread_id, run_id);
            while (runStatus.status !== 'completed') {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 1 second
                runStatus = await openai.beta.threads.runs.retrieve(thread_id, run_id);
            }
            // await openai.beta.threads.del(thread_id)
            return;
        }
        catch (error) {
            console.log(error);
            return error; 
        }
    }
    function addLastMessagetoArray(message, messages){
        messages.push(message.data[0].content[0].text.value)
        console.log("PRINTING MESSAGES: ");
        console.log(message.data[0].content[0].text.value)
        return;
    }
  
    await runAssistant(assistant_id, thread_id, instructions);
  
    return messages;
}

const details = {
    "name": "writer",
    "parameters": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "The name of the assistant to use. eg writer"
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
    "description": "This is a fiction writer that can write stories based on instructions"
  }
export { execute, details };
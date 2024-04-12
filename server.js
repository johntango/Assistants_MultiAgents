

import express from 'express';
import path from 'path';
const app = express();
const port = 4000;
import fs from 'fs';
import axios from 'axios';
import OpenAI from 'openai';
import fileURLToPath from 'url';
import bodyParser from 'body-parser';
import { get } from 'http';
import { URL } from 'url';
//import { OpenAI } from "@langchain/openai"
//const sqlite3 = require('sqlite3');

let assistants = {}
//let tools = [{ role:"function", type: "code_interpreter" }, { role:"function",type: "retrieval" }]
let tools = [];
//const get_weather = require('./functions/get_weather.js');
 
// Serve static images from the 'images' folder
const __dirname = new URL('.', import.meta.url).pathname;

app.use(express.static(__dirname +'/images'));


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// connect to db and get cursor
// Example usage:
//const dbPath = 'data/prompts.db';
//const db = getConnection(dbPath);

// Define global variables focus to keep track of the assistant, file, thread and run
let focus = { assistant_id: "", assistant_name: "", file_id: "", thread_id: "", message: "", func_name: "", run_id: "", status: "" };


// Middleware to parse JSON payloads in POST requests
app.use(express.json());

// Serve index.html at the root URL '/'
//get the root directory

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html')); 
});
//
// Run 
app.post('/run_assistant', async (req, res) => {
    let name = req.body.assistant_name;
    let instructions = req.body.message;
    if (instructions == "") {
        instructions = "You are a helpful assistant."
    }
    if (tools.length < 2) {
        //tools = [{ type: "code_interpreter" }, { type: "retrieval" }]
    }
    // this puts a message onto a thread and then runs the assistant on that thread
    let run_id;
    let messages = [];  // this accumulates messages from the assistant
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    let assistant = await create_or_get_assistant(name);
    let thread = await create_thread()

    focus.assistant_id = assistant.id;
    focus.thread_id = thread.id;
    focus.assistant_name = assistant.name;
    messages = await runAssistant(focus.assistant_id, focus.thread_id, instructions);
    res.status(200).json({ message: JSON.stringify(messages), focus: focus });
});

async function create_or_get_assistant(name, instructions) {
    const response = await openai.beta.assistants.list({
        order: "desc",
        limit: 20,
    })
    // loop over all assistants and find the one with the name name
    let assistant = {};
    for (let obj in response.data) {
        assistant = response.data[obj];
        // change assistant.name to small letters
        if (assistant.name.toLowerCase() == name.toLowerCase()) {
            focus.assistant_id = assistant.id;
            tools = assistant.tools;  // get the tool
            break
        }
    }
    if (focus.assistant_id == "") {
        assistant = await openai.beta.assistants.create({
            name: name,
            instructions: instructions,
            tools: tools,
            model: "gpt-4-1106-preview",
        });
        focus.assistant_id = assistant.id
        focus.assistant_name = name;
    }
    return assistant;
}
// create a new thread

async function create_thread() {
        // do we need an intitial system message on the thread?
    let response = await openai.beta.threads.create(
            /*messages=[
            {
              "role": "user",
              "content": "Create data visualization based on the trends in this file.",
              "file_ids": [focus.file_id]
            }
          ]*/
        )
    focus.thread_id = response.id;
    return response;
}

// Define routes
app.post('/create_assistant', async (req, res) => {
    // we should define the system message for the assistant in the input
    let system_message = req.body.system_message;
    let name = req.body.assistant_name;
    let instruction = "you are a helpful tool calling assistnt."
    try {
        let assistant = await create_or_get_assistant(name, instruction);
        let assistant_id = assistant.id;

        message = "Assistant created with id: " + assistant_id;
        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        return console.error('Error:', error);
    }
}
)
// get assistant by name
app.post('/get_assistant', async (req, res) => {
    let name = req.body.assistant_name;
    let instruction = "";
    let assistant = await create_or_get_assistant(name, instruction);
    focus.assistant_name = assistant.name;
    focus.assistant_id = assistant.id;
    console.log('Modify request received:', req.body);
    let message = `got Assistant ${name} :` + JSON.stringify(assistant);
    res.status(200).json({ message: message, focus: focus });
});

// this lists out all the assistants and extracts the latest assistant id and stores it in focus
app.post('/list_assistants', async (req, res) => {
    try {
        const response = await openai.beta.assistants.list({
            order: "desc",
            limit: 10,
        })
        console.log(`list of assistants ${JSON.stringify(response.data)}`);
        focus.assistant_id = extract_assistant_id(response.data).assistant_id;
        let message = JSON.stringify(response.data);
        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        return console.error('Error:', error);
    }
})
function extract_assistant_id(data) {
    let assistant_id = "";
    if (data.length > 0) {
        assistant_id = data[0].id;
        tools = data[0].tools
        // loop over assistants and extract all the assistants into a dictionary
        for (let assistant of data) {
            assistants[assistant.name] = assistant;
        }
    }

    console.log("got assistant_id: " + assistant_id);
    return { assistant_id: assistant_id, tools: tools }
}


app.post('/delete_assistant', async (req, res) => {
    try {
        let assistant_id = req.body.assistant_id;
        console.log("Deleting assistant_id: " + assistant_id);
        const response = await openai.beta.assistants.del(assistant_id);

        // Log the first greeting
        console.log(
            `deleted assistant ${JSON.stringify(response)}.\n`
        );
        message = "Assistant deleted with id: " + assistant_id;
        focus.assistant_id = "";
        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        return console.error('Error:', error);
    }
});

app.post('/upload_file', async (req, res) => {
    focus = req.body;
    let file = focus.file_id;  // this is the file name 
    if (!file) {
        return res.status(400).send('No files were uploaded.');
    }
    try {
        let filestream = fs.createReadStream(file);

        let response = await openai.files.create({
            file: filestream,
            purpose: "assistants"
        }
        )
        message = "File Uploaded with id: " + response.id;
        focus.file_id = response.id;
        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Upload action failed' });
    }
});

app.post('/create_file', async (req, res) => {
    let data = req.body;
    // get the assistant id from the request as a string
    let assistant_id = data.assistant_id;
    // check that this assistant has either retrieve or code_interpreter active
    if (check_assistant_capability() == true) {
        let file_id = data.file_id;  // this is the file id
        console.log("in create_file assistant_id: " + assistant_id + " file_id: " + file_id);
        try {
            let response = await openai.beta.assistants.files.create(
                assistant_id,
                {
                    file_id: file_id
                }
            )
            message = "File Attached to assistant: " + JSON.stringify(response);
            focus.file_id = response.id;
            res.status(200).json({ message: message, focus: focus });
        }
        catch {
            message = "Assistant needs to have retrieve or code_interpreter active"
            res.status(200).json({ message: message, focus: focus })
        }
    }
});
// check the active assistant (we only allow one to be active at present)
function check_assistant_capability() {
    if (tools[0].type == "code_interpreter" || tools[0].type == "retrieval") {
        return true
    }
    else { return false }
}

// list files and put the latest file id into focus
app.post('/list_files', async (req, res) => {

    let data = req.body;
    let assistant_id = data.assistant_id;
    try {
        let response = await openai.beta.assistants.files.list(
            assistant_id
        )
        message = response;
        console.log("list_files response: " + JSON.stringify(response));
        // check if files exist
        if (response.data.length > 0) {
            focus.file_id = response.data[0].id;
        }

        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'List files action failed' });
    }
});

app.post('/delete_file', async (req, res) => {
    let data = req.body;
    let assistant_id = data.assistant_id;
    let file_id = data.file_id;
    try {
        let response = await openai.beta.assistants.files.del(
            assistant_id,
            file_id
        )
        message = response;

        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'List files action failed' });
    }
});

app.post('/create_thread', async (req, res) => {
    let assistant_id = req.body.assistant_id;
    try {
        let response = await openai.beta.threads.create(
            /*messages=[
            {
              "role": "user",
              "content": "Create data visualization based on the trends in this file.",
              "file_ids": [focus.file_id]
            }
          ]*/
        )

        let message = response;
        console.log("create_thread response: " + JSON.stringify(response));
        focus.thread_id = response.id;
        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Thread Create failed' });
    }
});

app.post('/delete_thread', async (req, res) => {
    let thread_id = req.body.thread_id;
    try {
        let response = await openai.beta.threads.del(thread_id)
        message = "Thread deleted with id: " + response.id;
        focus.thread_id = ""
        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Thread Delete failed' });
    }
});

app.post('/create_run', async (req, res) => {
    let thread_id = req.body.thread_id;
    let assistant_id = req.body.assistant_id;
    console.log("create_run thread_id: " + thread_id + " assistant_id: " + assistant_id);
    try {
        let response = await openai.beta.threads.runs.create(thread_id, {
            assistant_id: assistant_id
        })
        focus.run_id = response.id;
        console.log("create_run response: " + JSON.stringify(response));
        res.status(200).json({ message: JSON.stringify(response), focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Run Delete failed' });
    }
});
//
// this is the main loop in handling messages calling functions etc
//
app.post('/run_status', async (req, res) => {
    let thread_id = req.body.thread_id;
    let run_id = req.body.run_id;
    try {
        let response = await openai.beta.threads.runs.retrieve(thread_id, run_id)
        let message = response;
        focus.status = response.status;
        let tries = 0;
        while (response.status == 'in_progress' && tries < 10) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 1 second
            response = await openai.beta.threads.runs.retrieve(thread_id, run_id);
            tries += 1;
        }
        if (response.status === "requires_action") {
            get_and_run_tool(response);
        }

        if (response.status == "completed" || response.status == "failed") {
            let message = "Completed run with status: " + response.status;
            res.status(200).json({ message: message, focus: focus });
        }

    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Run Status failed' }, focus);
    }
})
// requires action is a special case where we need to call a function
async function get_and_run_tool(response) {
    let thread_id = focus.thread_id;
    let run_id = focus.run_id;
    // extract function to be called from response
    const toolCalls = response.required_action.submit_tool_outputs.tool_calls;
    let toolOutputs = []
    let functions_available = await getFunctions();
    for (let toolCall of toolCalls) {
        console.log("toolCall: " + JSON.stringify(toolCall));
        let functionName = toolCall.function.name;
        // get function from functions_available
        let functionToExecute = functions_available[`${functionName}`];

        if (functionToExecute.execute) {
            let args = JSON.parse(toolCall.function.arguments);
            let argsArray = Object.keys(args).map((key) => args[key]);
            let functionResponse = await functionToExecute.execute(...argsArray);
            toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(functionResponse)
            });
            let text = JSON.stringify({ message: `function ${functionName} called`, focus: focus });
            await openai.beta.threads.runs.submitToolOutputs(
                thread_id,
                run_id,
                {
                    tool_outputs: toolOutputs
                }
            );
        }
        continue;
    }
}

app.post('/delete_run', async (req, res) => {
    let thread_id = req.body.thread_id;
    let assistant_id = req.body.assistant_id;
    let run_id = req.body.run_id;
    try {
        let response = await openai.beta.threads.runs.cancel(thread_id, run_id)
        message = response;
        focus.run_id = response.id;
        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Run Delete failed' });
    }
});
app.post('/create_message', async (req, res) => {
    let prompt = req.body.message;
    let thread_id = req.body.thread_id;
    console.log("create_message: " + prompt + " thread_id: " + thread_id);
    try {
        let response = await openai.beta.threads.messages.create(thread_id,
            {
                role: "user",
                content: prompt,
            })
        let message = await response;
        console.log("create message response: " + JSON.stringify(response));
        res.status(200).json({ message: message, focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Create  Message failed' });
    }
});


app.post('/get_messages', async (req, res) => {
    let thread_id = focus.thread_id;
    let run_id = focus.run_id;
    console.log("get_messages: on thread_id: " + thread_id + " run_id: " + run_id);
    try {

        await get_run_status(thread_id, run_id);
        // now retrieve the messages
        let response = await openai.beta.threads.messages.list(thread_id)
        let all_messages = get_all_messages(response);
        res.status(200).json({ message: all_messages, focus: focus });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Get messages failed' });
    }
});
function get_all_messages(response) {
    let all_messages = [];
    let role = "";
    let content = "";
    for (let message of response.data) {
        // pick out role and content
        role = message.role;
        content = message.content[0].text.value;
        all_messages.push({ role, content });
    }
    return all_messages
}
//
// this puts a message onto a thread and then runs the assistant 
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
        let run_id = run.id;
        focus.run_id = run_id;
        focus.assistant_id = assistant_id;
        focus.thread_id = thread_id;
        await get_run_status(thread_id, run_id); // blocks until run is completed
        // now retrieve the messages
        let response = await openai.beta.threads.messages.list(thread_id)
        return get_all_messages(response);

    }
    catch (error) {
        console.log(error);
        return error;
    }
}
async function get_run_status(thread_id, run_id) {
    try {
        let response = await openai.beta.threads.runs.retrieve(thread_id, run_id)
        let message = response;
        focus.status = response.status;
        let tries = 0;
        while (response.status == 'in_progress' && tries < 10) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 1 second
            response = await openai.beta.threads.runs.retrieve(thread_id, run_id);
            tries += 1;
        }
        if (response.status === "requires_action") {
            get_and_run_tool(response);
        }

        if (response.status == "completed" || response.status == "failed") {

        }
        // await openai.beta.threads.del(thread_id)
        return
    }
    catch (error) {
        console.log(error);
        return error;
    }
}


//
// add all messages to array
//
function addLastMessagetoArray(message, messages) {
    if (message !== undefined) {
        role = message.data[0].role;
        content = message.data[0].content[0].text.value;
        messages.push({ role, content });
    }
}
// Langchain version of Loop
app.post('/loopLC', async (req, res) => {
    let thread_id = focus.thread_id;
    let writer = assistants.Writer;
    let critic = assistants.Critic;
    let messages = [];
    try {
        // Create a LangChain instance
        const chain = new LangChain();

        // Run the Writer Assistant to create a first draft
        chain.addAssistant(writer.id);
        chain.addInstruction("Write a paragraph about a king and his gaudy clothes");
        await chain.run(thread_id);
        await get_run_status(thread_id, focus.run_id, messages);

        // Run the Critic Assistant to provide feedback
        chain.addAssistant(critic.id);
        chain.addInstruction("Provide constructive feedback to what the Writer assistant has written");
        await chain.run(thread_id);
        await get_run_status(thread_id, focus.run_id, messages);

        // Have the Writer Assistant rewrite the first chapter based on the feedback from the Critic
        chain.addAssistant(writer.id);
        chain.addInstruction(`Using the feedback from the Critic Assistant rewrite the first chapter given here: ${messages[0]}`);
        await chain.run(thread_id);
        await get_run_status(thread_id, focus.run_id, messages);

        // create one message with all the messages input to the thread
        let textMessage = messages.join("\n");

        res.status(200).json({ message: JSON.stringify(textMessage), focus: focus });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "An error occurred" });
    }
});

app.post('/loop', async (req, res) => {
    let thread_id = focus.thread_id;
    let writer = assistants.Writer;
    let critic = assistants.Critic;
    let messages = [];
    try {
        // Run the Writer Assistant to create a first draft                      
        await runAssistant(writer.id, thread_id, "Write a paragraph about a king and his gaudy clothes")
        await get_run_status(thread_id, focus.run_id, messages)

        // Run the Critic Assistant to provide feedback 
        await runAssistant(critic.id, thread_id, `Provide constructive feedback to what the Writer assistant has written`)
        await get_run_status(thread_id, focus.run_id, messages)

        // Have the Writer Assistant rewrite the first chapter based on the feedback from the Critic        
        await runAssistant(writer.id, thread_id, `Using the feedback from the Critic Assistant rewrite the first chapter given here: ${messages[0]}`)
        await get_run_status(thread_id, focus.run_id, messages)

        // create one message with all the messages input to the thread
        let textMessage = messages.join("\n")

        res.status(200).json({ message: JSON.stringify(textMessage), focus: focus })
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Get messages failed' });
    }
});
// some code that might be useful
//messages.append({"role": "tool", "tool_call_id": assistant_message["tool_calls"][0]['id'], "name": assistant_message["tool_calls"][0]["function"]["name"], "content": results})

async function get_tools(assistant_id) {
    let response = await openai.beta.assistants.retrieve(assistant_id);
    let tools = response.tools;
    return tools;
}

app.post('/list_tools', async (req, res) => {
    let assistant_id = focus.assistant_id;
    const functions = await getFunctions();
    // I want to loop over dictionary called functions and create a tools array
    /*let mytool = {
        "type": "function", "function": {
            "name": "writer_tool",
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
    };
*/
    let local_tools = [];
    //local_tools.push(mytool);
    let tools = await get_tools(assistant_id);

    let keys = Object.keys(functions);
    for (let key of keys) {
        let details = functions[key].details;
        // check if the function is already in the tools
        let found = false;
        for (let tool of tools) {
            if (tool.function.name == key) {
                found = true;
                break;
            }
        }
        if (!found) {
            local_tools.push({ "type": "function", "function": details })
        }
    }

    // add the tools to the assistant if they are not already there
    if (local_tools.length > 0) {
        const response = await openai.beta.assistants.update(
            assistant_id,
            { "tools": local_tools }
        )
        console.log("assistant with tools updated: " + JSON.stringify(response));
    }
  
    //focus.func_name = "crawlDomainGenEmbeds";
    res.status(200).json({ message: JSON.stringify(response), focus: focus });
})
async function getFunctions() {
    const files = fs.readdirSync(path.resolve(__dirname, "./functions"));
    const openAIFunctions = {};

    for (const file of files) {
        if (file.endsWith(".js")) {
            const moduleName = file.slice(0, -3);
            const modulePath = `./functions/${moduleName}.js`;
            const { details, execute } = await import(modulePath);

            openAIFunctions[moduleName] = {
                "details": details,
                "execute": execute
            };
        }
    }
    return openAIFunctions;
};

app.post('/run_function', async (req, res) => {
    // Step 1: send the conversation and available functions to the model
    const messages = [
        { role: "user", content: "What's the weather like in San Francisco, Tokyo, and Paris?" },
    ];

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: messages,
        tools: tools,
        tool_choice: "auto", // auto is default, but we'll be explicit
    });
    const responseMessage = await response.choices[0].message;
    res.status(200).json({ message: responseMessage, focus: focus });

});

app.post('/table', (req, res) => {
    const sql = "SELECT * FROM prompts";
    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        }
        rows.forEach((row) => {
            console.log(row);
        });
        res.status(200).json({ message: JSON.stringify(rows), focus: focus });
        //res.render('table', { rows });
    });
});


//this is where we write to the database
function insertIntoTable(db, data) {
    const sql = `
        INSERT INTO prompts (topic, sentiment, style, tone, language, prompt, response) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [data.topic, data.sentiment, data.style, data.tone, data.language, data.prompt, data.response], function (err) {
        if (err) {
            return console.error("Error inserting data:", err.message);
        }
        console.log(`Row inserted with ID: ${this.lastID}`);
    });
}

function getConnection(dbPath) {
    return new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Error connecting to the database:", err.message);
        } else {
            console.log("Connected to the SQLite database.");
        }
    });
}
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

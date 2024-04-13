
    import OpenAI from 'openai';
    import fs from 'fs';
    import { get } from 'http';
    import { run_named_assistant } from '../run_named_assistant.js';

    const execute = async (name, instructions) => {
        let message = await run_named_assistant("zookeeper", instructions);
        return message;
    }

    const details = {
        "name": "zookeeper",
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
        "description": "This is a zookeeper assistant that follows instructions"
    }
    export { execute, details }; 
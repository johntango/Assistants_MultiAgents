import OpenAI from 'openai';
import fs from 'fs';
import { get } from 'http';
import { run_named_assistant } from '../run_named_assistant.js';

const execute = async (name, instructions) => {
    let message = await run_named_assistant("critic", instructions);
    return message;
}
const details = {
    "name": "emailcritic",
    "parameters": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "You are a harsh critic of emails."
            },
            "instructions": {
                "type": "string",
                "description": "The email and the instructions for the emailcritic."
            }
        },
        "required": ["name", "instructions"]
    },
    "description": "This is a critic of emails passed to it",
};
export { execute, details };
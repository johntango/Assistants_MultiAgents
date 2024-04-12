require("dotenv").config();
//const fileURLToPath = require("url");
const path = require("path");
const fs = require("fs");
console.log("Welcome to the Assistant!\n");
function getFunctions() {
    const files = fs.readdirSync(path.resolve(__dirname, "./functions"));
    const openAIFunctions = {};

    for (const file of files) {
      if (file.endsWith(".js")) {
        const moduleName = file.slice(0, -3);
        const modulePath = `./functions/${moduleName}.js`;
        const { execute, details } = await import(modulePath);

        openAIFunctions[moduleName] = {
          execute,
          details,
        };
      }
    }

    return openAIFunctions;
  }

// populate a div with id="functions" with a list of functions to be used in assistant

function updateUI() {
    let functions = await getFunctions();
    console.log(`functions: ${JSON.stringify(functions)}`);
    function_list = document.getElementById("functions");
    for (const [key, value] of Object.entries(functions)) {
        let option = document.createElement("option");
        option.value = key;
        option.text = key;
        function_list.appendChild(option);
        }

    console.log(`functions: ${JSON.stringify(functions)}`);
    const function_list = document.getElementById("functions");
    for (const [key, value] of Object.entries(functions)) {
        let option = document.createElement("option");
        option.value = key;
        option.text = key;
        function_list.appendChild(option);
    }
    // populate a div with id="run_status" with a list of run status options
    const run_status = document.getElementById("run_status");
    let option = document.createElement("option");
    option.value = "completed";
        option.text = "completed";
        run_status.appendChild(option);
        option = document.createElement("option");
        option.value = "running";
        option.text = "running";
        run_status.appendChild(option);
        option = document.createElement("option");
        option.value = "failed";
        option.text = "failed";
        run_status.appendChild(option);
        // populate a div with id="assistant_id" with a list of assistant ids
    }



let data = {
  assistant_id: "",
  file_id: "",
  thread_id: "",
  message: "",
  func_name: "",
  run_id: "",
  status: "",
};

function get_data_from_elements() {
  data.assistant_id = document.getElementById("assistant_id").value;
  data.file_id = document.getElementById("file_id").value;
  data.thread_id = document.getElementById("thread_id").value;
  data.message = document.getElementById("message").value;
  data.func_name = document.getElementById("func_name").value;
  data.run_id = document.getElementById("run_id").value;
  data.status = document.getElementById("run_status").value;
}
function write_data_to_elements(data) {
  document.getElementById("assistant_id").value = data.assistant_id;
  document.getElementById("file_id").value = data.file_id;
  document.getElementById("thread_id").value = data.thread_id;
  document.getElementById("message").value = data.message;
  document.getElementById("func_name").value = data.func_name;
  document.getElementById("run_id").value = data.run_id;
  document.getElementById("run_status").value = data.status;
}

function write_to_div(route, message) {
  console.log(`message in Write to Div: ${JSON.stringify(message)}`);
  let div = document.getElementById("response");
  div.innerHTML = JSON.stringify(message);
}
async function sendRequest(route) {
  get_data_from_elements();
  console.log(`sending data: ${JSON.stringify(data)} to ${route}`);
  let response = await fetch(`/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    mode: "cors",
  });
  let res = await response.json();
  console.log(`In UI response: ${JSON.stringify(res)}`);
  parse_response(route, res);
  return;
}
function parse_response(route, response) {
  data = response.focus;
  write_data_to_elements(data);
  write_to_div(route, response.message);
}
updateUI();
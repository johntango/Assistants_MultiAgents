import process from 'process';

const execute = async (query) => {
    let top_result_to_return = 4
    let url = "https://google.serper.dev/search"
    let payload = JSON.stringify({"q": query})
    let serperkey = process.env.SERPER_API_KEY;
    let headers = {
    'SERPER-API-KEY': serperkey,
    'content-type': 'application/json'
    }
// use fetch
    try {
        let response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: payload
        })
        let data = await response.json();

        return data;
    }
    catch (error) {
        console.log(error);
        return error;
    }
}
const details = {
    "name": "serpersearch",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "The query"
        }
      },
      "required": ["query"]
    },
    "description": "This searches the web for the query"
  }
export { execute, details };



const execute = async (query) => {
    let top_result_to_return = 4
    let url = "https://google.serper.dev/search"
    let payload = json.dumps({"q": query})
    headers = {
    'X-API-KEY': os.environ['SERPER_API_KEY'],
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

        return data.results.slice(0, top_result_to_return);
    }
    catch (error) {
        console.log(error);
        return error;
    }
}
const details = {
    "name": "searchweb",
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


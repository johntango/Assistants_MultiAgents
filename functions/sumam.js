
async function execute(...args) {
    // Calculate the sum of the numbers
    let sum = 0;
    for (let i = 0; i < args.length; i++) {
        // convert string to number
        sum += parseInt(args[i]);
  }

  // Return the sum converted to a string
  return sum.toString();
}

// Example usage:
execute(1, 2, 3, 4, 5).then(result => console.log(result)); // Outputs: "15"

    
const details = {
    "name": "sumam",
    "parameters": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {  // Specify the schema for items in the array
                    "type": "number"  // Change from string to number if it should be a number
                },
                "description": "The list of numbers to sum"
            }
        },
        "required": ["items"],
        "description": "This is a schema that sums a list of numbers"
    }
}

    export { execute, details }; 
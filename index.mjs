import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: ''
});

async function getHighRiskAreas(date) {
    const url = `https://boasandreasen.github.io/testAPI/${date}.json`;

    try {
        const response = await fetch(url);
        const data = (await response.json()).data;

        const topValues = [];
        data.forEach((row, row_index) => {
            row.forEach((value, col_index) => {
                topValues.push({ value, row: row_index, col: col_index });
                if (topValues.length > 5) {
                    topValues.sort((a, b) => a.value - b.value);
                    topValues.pop();
                }
            });
        });

        let statement = "The top 5 highest values and their coordinates were: ";
        topValues.forEach(({ value, row, col }, i) => {
            if (i > 0) {
                statement += ", ";
            }
            statement += `${value} (${row}, ${col})`;
        });

        return statement;
    } catch (error) {
        console.error("Error fetching data:", error);
        return "Error fetching data.";
    }
}
// Test function
//getHighRiskAreas("01012024").then(result => console.log(result));

function getTimeOfDay(){
    let date = new Date()
    let hours = date.getHours()
    let minutes = date.getMinutes()
    let seconds = date.getSeconds()
    let timeOfDay = "AM"
    if(hours > 12){
        hours = hours - 12
        timeOfDay = "PM"
    }
    return hours + ":" + minutes + ":" + seconds + " " + timeOfDay
}
// Test function
// console.log(getTimeOfDay());

// Define initial instructions to which new prompts will be appended
let messages = [
    {
    role: "system",
    content: "You are a helpful assistant. " +
        "If you are asked about the current time of day, use the getTimeOfDay function to get the information, " +
        "If you are asked about most concerning or highest values in the heatmap for a specific date, use the get_high_risk_areas function to get the information, " +
        "then answer the user's question using that data exclusively.",
    }
]

// Define ChatGPT Function
async function callChatGPTWithFunctions(userMessage){
    // Add user query to messages
    messages.push({
        role: "user",
        content: userMessage
    })

    // Step 1: Call ChatGPT with the function name
    let chat = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0613",
        messages: messages,
        functions: [
        {
            name: "getTimeOfDay",
            description: "Get the time of day.",
            parameters: {
                type: "object",
                properties: {
                },
                require: [],
            }
        },
        {
            name: "getHighRiskAreas",
            description: "Get the areas with the highest risk of a wildfire",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        "type": "string",
                        "description": "The Date in DDMMYYYY format, for example 01012024"
                    }
                },
                required: [
                    "date"
                ]
            }
        }
        ],
        function_call: "auto",
    })


    console.log(chat)
    console.log(chat.choices[0].message)
    console.log(chat.choices[0].message.function_call)
    console.log(chat.choices[0].message.function_call.arguments)


    // Step 2: Check if ChatGPT wants to use a function
    let wantsToUseFunction = chat.choices[0].finish_reason == "function_call"
    let content = ""

    // Step 3: Use ChatGPT arguments to call a function
    if(wantsToUseFunction){
        if(chat.choices[0].message.function_call.name == "getHighRiskAreas"){
            let argumentObj = JSON.parse(chat.choices[0].message.function_call.arguments)
            content = await getHighRiskAreas(argumentObj.date)
            messages.push(chat.choices[0].message)
            messages.push({
                role: "function",
                name: "getHighRiskAreas",
                content,
            })
        }
        if(chat.choices[0].message.function_call.name == "getTimeOfDay"){
            content = getTimeOfDay()
            messages.push(chat.choices[0].message)
            messages.push({
                role: "function",
                name: "getTimeOfDay",
                content,
            })
        }

        // Step 4: Call ChatGPT again with the function response
        let step4response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0613",
            messages,
        });
        console.log(step4response.choices[0])

    } else { // Step 3 if ChatGPT does not want to call a function
        // Print response without calling function
        console.log(chat.choices[0])
    }

}

//callChatGPTWithFunctions("What is the current time of day?")
callChatGPTWithFunctions("What are the most concerning values on the heatmap for 1st of january 2024?")


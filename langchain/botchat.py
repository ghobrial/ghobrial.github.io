import os
import boto3

# Initialize the Bedrock Runtime client
bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-1")

# Set the model ID for Amazon Titan Text
model_id = "amazon.titan-text-premier-v1:0"

# Function to handle user input and generate a response
def generate_response(user_input, conversation_history):
    # Prepare the conversation history with the user input
    messages = [msg for msg in conversation_history if msg["role"] != "system"]
    messages.append({"role": "user", "content": [{"text": user_input}]})

    try:
        # Send the conversation to Amazon Titan Text
        response = bedrock_client.converse(
            modelId=model_id,
            messages=messages,
            inferenceConfig={"maxTokens": 512, "temperature": 0.5, "topP": 0.9},
        )

        # Extract the response text
        response_text = response["output"]["message"]["content"][0]["text"]

        # Update the conversation history
        conversation_history.append({"role": "user", "content": [{"text": user_input}]})
        conversation_history.append({"role": "assistant", "content": [{"text": response_text}]})

        return response_text

    except Exception as e:
        print(f"Error: {e}")
        return "Sorry, I encountered an error. Please try again later."

# Example usage
conversation_history = []
user_input = "Hello"
response = generate_response(user_input, conversation_history)
print(f"Bot: {response}")

# Continue the conversation
while True:
    user_input = input("You: ")
    if user_input == "bye":
       break
    else:
      response = generate_response(user_input, conversation_history)
      print(f"Bot: {response}")
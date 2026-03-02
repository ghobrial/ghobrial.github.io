from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_aws import ChatBedrock
import boto3

#Initialize the Amazon Bedrock connection
bedrock_client = boto3.client("bedrock-runtime", region_name = "us-east-1")
    
model_id = "amazon.titan-text-premier-v1:0"
model_kwargs = {
      "maxTokenCount": 512,
      "temperature": 0.5,
       "topP": 0.9,
}
    
# Create a ChatBedrock object
llm = ChatBedrock(
      model_id=model_id,
      model_kwargs=model_kwargs,
      client=bedrock_client
)

# Create a ChatPromptTemplate object
prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful AI assistant. Answer the following questions as best you can."),
        ("placeholder", "{chat_history}"),
        ("human", "{input}")
    ]
)

history = InMemoryChatMessageHistory()

def get_history():
    return history

# Chain the three LangChain components together
chain = prompt | llm | StrOutputParser()

# Ensure that LLM interactions include the history
wrapped_chain = RunnableWithMessageHistory(
    chain,
    get_history,
    history_messages_key="chat_history",
)

def get_llm_response(user_input):
    response = wrapped_chain.invoke({"input": user_input})
    return response

# Main loop to continuously prompt the user for input
while True:
    user_input = input("Enter your question (or 'quit' to exit): ")
    
    if user_input.lower() == 'quit':
        print("Exiting the program. Goodbye!")
        break
    
    llm_response = get_llm_response(user_input)
    print("\nTitan LLM Response:")
    print(llm_response + "\n")
const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { RunnablePassthrough, RunnableSequence } = require("@langchain/core/runnables");
const { formatDocumentsAsString } = require("langchain/util/document");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const {
    GOOGLE_AI_MODEL,
    GOOGLE_AI_MAX_OUTPUT_TOKENS,
    GOOGLE_API_KEY,
    GOOGLE_AI_EMBEDDING_MODEL
} = require("dotenv").config();

const PPC_PATH = "ppc.pdf";
const FAISS_STORE_PATH = "./faiss-store";

async function saveFaissStore(embedding) {
    const loader = new PDFLoader(PPC_PATH);
    const pages = await loader.load();

    const vectorStore = new FaissStore(embedding, {});
    await vectorStore.addDocuments(pages);
    await vectorStore.save(FAISS_STORE_PATH);
}

async function loadVectorStore(embedding) {
    return await FaissStore.load(
        FAISS_STORE_PATH,
        embedding
    );
}

async function query(input) {
    const model = new ChatGoogleGenerativeAI({
        model: GOOGLE_AI_MODEL,
        maxOutputTokens: GOOGLE_AI_MAX_OUTPUT_TOKENS,
        apiKey: GOOGLE_API_KEY
    });

    const embedding = new GoogleGenerativeAIEmbeddings({
        model: GOOGLE_AI_EMBEDDING_MODEL,
        apiKey: GOOGLE_API_KEY
    });

    vectorStore = await loadVectorStore(embedding);
    const retriever = vectorStore.asRetriever();

    const TEMPLATE = `Você é um bot que tira dúvidas sobre o Projeto Pedagógico do curso (PPC) de Ciência da Computação da UFRN. O seu criador é @isaacmsl. Você é gentil nas respostas. Se o usuário fez uma pergunta sobre o PPC, então responda de maneira contextualizada e informando as páginas do PPC que podem ser vistas. Se você não souber a resposta, apenas mostre como pode ajudá-lo, não tente inventar uma resposta. Use os seguintes pedaços do PPC (context) para responder as questões do usuário.
----------------
{context}
----------------
User: {question}`;

    const prompt = ChatPromptTemplate.fromTemplate(TEMPLATE);

    const chain = RunnableSequence.from([
        {
            context: retriever.pipe(formatDocumentsAsString),
            question: new RunnablePassthrough(),
        },
        prompt,
        model
    ]);

    const answer = await chain.invoke(input);
    return answer.content;
}

module.exports = { query };
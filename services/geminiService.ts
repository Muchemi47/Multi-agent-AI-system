
import { GoogleGenAI, Type } from "@google/genai";
import { Agent, SharedState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTIONS: Record<Agent, string> = {
  [Agent.SUPERVISOR]: `You are the Supervisor. Based on the state, decide the next agent. Rules: No plan->Planner, No explanation->Explainer, No quiz->QuizGen, Student answer exists->FeedbackAnalyzer, Feedback exists->Motivator, Full output exists->QualityReviewer. Output format: NEXT_AGENT: <name> REASON: <reason>.`,
  [Agent.CURRICULUM_PLANNER]: "You are a Curriculum Planner. Create a structured lesson plan with 3 learning objectives for the given topic and difficulty level.",
  [Agent.CONCEPT_EXPLAINER]: "You are a Concept Explainer. Write a clear, engaging explanation of the topic based on the lesson plan. Use analogies and simple terms suitable for the difficulty level.",
  [Agent.QUIZ_GENERATOR]: "You are a Quiz Generator. Create a 3-question multiple choice quiz to test the user's understanding of the explanation.",
  [Agent.FEEDBACK_ANALYZER]: "You are a Feedback Analyzer. Evaluate the student's answers against the quiz and explanation. Provide constructive feedback and score (0-100).",
  [Agent.MOTIVATOR]: "You are a Motivator. Provide an encouraging, high-energy message to the student based on their feedback and performance.",
  [Agent.QUALITY_REVIEWER]: "You are a Quality Reviewer. Review all artifacts (plan, explanation, quiz, feedback). Decide if they meet pedagogical standards. Output JSON: { approved: boolean, comments: string, confidence: number (0-1) }.",
  [Agent.HUMAN_APPROVAL]: "You are requesting Human Approval. Summarize the changes or status for the human.",
  [Agent.END]: "Session completed.",
};

export const callAgent = async (agent: Agent, state: SharedState): Promise<string> => {
  const model = 'gemini-3-flash-preview';
  const prompt = `Current State: ${JSON.stringify(state)}. Topic: ${state.topic}. Difficulty: ${state.difficulty}. Please perform your task.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS[agent],
        temperature: 0.7,
        ...(agent === Agent.QUALITY_REVIEWER ? { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    approved: { type: Type.BOOLEAN },
                    comments: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                },
                required: ["approved", "comments", "confidence"]
            }
        } : {})
      },
    });

    return response.text || "No response generated.";
  } catch (error) {
    console.error(`Error calling agent ${agent}:`, error);
    throw error;
  }
};

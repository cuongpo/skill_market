import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { Wallet, JsonRpcProvider } from "ethers";
import OpenAI from "openai";
import { env } from "../config/env.js";
import type { MessageParam } from "./claudeService.js";

type ZGBroker = Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;

let _broker: ZGBroker | null = null;
let _providerAddress: string | null = null;

async function getBroker(): Promise<ZGBroker> {
  if (_broker) return _broker;
  const provider = new JsonRpcProvider(env.ZERO_G_RPC_URL);
  const wallet = new Wallet(env.PLATFORM_PRIVATE_KEY, provider);
  _broker = await createZGComputeNetworkBroker(wallet);
  return _broker;
}

async function getProvider(broker: ZGBroker): Promise<string> {
  if (_providerAddress) return _providerAddress;
  const services = await broker.inference.listService();
  if (services.length === 0) throw new Error("No 0G Compute providers available");
  _providerAddress = services[0].provider;
  return _providerAddress;
}

export type InferenceResult = {
  fullText: string;
  inputTokens: number;
  outputTokens: number;
  via0GCompute: boolean;
};

export async function streamVia0GCompute(
  systemPrompt: string,
  history: MessageParam[],
  onDelta: (text: string) => void
): Promise<InferenceResult> {
  const broker = await getBroker();
  const providerAddress = await getProvider(broker);

  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

  const userContent = history[history.length - 1]?.content ?? "";
  const headers = await broker.inference.getRequestHeaders(providerAddress, userContent);

  const client = new OpenAI({ baseURL: endpoint, apiKey: "" });

  const stream = await client.chat.completions.create(
    {
      model,
      max_tokens: 1024,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
    },
    { headers: { ...headers } }
  );

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let chatId = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      onDelta(delta);
      fullText += delta;
    }
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens;
      outputTokens = chunk.usage.completion_tokens;
    }
    if (!chatId && chunk.id) chatId = chunk.id;
  }

  const usageJson = JSON.stringify({ prompt_tokens: inputTokens, completion_tokens: outputTokens });
  await broker.inference.processResponse(providerAddress, chatId, usageJson).catch(() => {});

  console.log(`[0G Compute] inference via provider ${providerAddress}, model ${model}`);
  return { fullText, inputTokens, outputTokens, via0GCompute: true };
}

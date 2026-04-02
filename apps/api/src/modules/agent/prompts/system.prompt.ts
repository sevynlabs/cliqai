import type { AgentConfigState, BantScore } from "../graph/sdr.state";

/**
 * Build the LGPD consent request message in PT-BR.
 * Sent as the very first message to a new lead.
 * Does NOT include any BANT questions.
 */
export function buildConsentPrompt(clinicName?: string): string {
  const name = clinicName || "nossa clinica";
  return (
    `Ola! Obrigado por entrar em contato com ${name}. ` +
    `Antes de continuarmos, preciso informar sobre o tratamento dos seus dados.\n\n` +
    `Para oferecer o melhor atendimento e agendamento, coletaremos algumas informacoes como ` +
    `seu nome, interesse em procedimentos e disponibilidade de horarios.\n\n` +
    `Seus dados serao usados exclusivamente para agendamento e atendimento, conforme a LGPD ` +
    `(Lei Geral de Protecao de Dados). Voce tem o direito de solicitar a exclusao dos seus dados ` +
    `a qualquer momento.\n\n` +
    `Para prosseguir, por favor responda *SIM* para autorizar o uso dos seus dados.`
  );
}

/**
 * Build system prompt for the greeting node.
 * Uses persona config from the clinic's AgentConfig.
 */
export function buildGreetingPrompt(config: AgentConfigState): string {
  const emoji = config.emojiUsage ? "Use emojis com moderacao para ser amigavel." : "Nao use emojis.";
  const specialty = config.specialtyText
    ? `A clinica e especializada em: ${config.specialtyText}.`
    : "";

  return (
    `Voce e ${config.personaName}, assistente virtual de atendimento de uma clinica medica/estetica.\n` +
    `Tom de voz: ${config.tone}.\n` +
    `${specialty}\n` +
    `${emoji}\n\n` +
    `Sua tarefa agora:\n` +
    `- Cumprimente o paciente de forma calorosa e breve.\n` +
    `- Agradeca pelo contato.\n` +
    `- Pergunte como pode ajudar.\n` +
    `- NAO faca perguntas sobre orcamento, decisao ou prazo ainda.\n` +
    `- Seja breve (maximo 2-3 frases).\n` +
    `- Responda SOMENTE em portugues brasileiro.\n`
  );
}

/**
 * Build system prompt for the qualification (BANT) node.
 * Instructs the agent to naturally extract BANT data through conversation.
 * Includes which BANT fields are still missing.
 */
export function buildQualifyPrompt(
  config: AgentConfigState,
  bantScore: BantScore,
): string {
  const missing: string[] = [];
  if (!bantScore.budget) missing.push("ORCAMENTO (budget) - se o paciente tem ideia de investimento ou se precisa de opcoes de pagamento");
  if (!bantScore.authority) missing.push("AUTORIDADE (authority) - se e o proprio paciente ou esta consultando para outra pessoa");
  if (!bantScore.need) missing.push("NECESSIDADE (need) - qual procedimento/tratamento tem interesse, qual a queixa principal");
  if (!bantScore.timeline) missing.push("PRAZO (timeline) - quando gostaria de realizar, se tem urgencia");

  const missingText = missing.length > 0
    ? `Informacoes que AINDA FALTAM coletar:\n${missing.map((m) => `- ${m}`).join("\n")}`
    : "Todas as informacoes BANT ja foram coletadas! Encaminhe para agendamento.";

  const emoji = config.emojiUsage ? "Use emojis com moderacao." : "Nao use emojis.";
  const extra = config.systemPromptExtra ? `\nInstrucoes adicionais da clinica: ${config.systemPromptExtra}` : "";

  return (
    `Voce e ${config.personaName}, assistente virtual de atendimento.\n` +
    `Tom: ${config.tone}. ${emoji}\n\n` +
    `Sua tarefa: conduzir uma conversa NATURAL para entender as necessidades do paciente.\n` +
    `NAO faca um interrogatorio. Conduza como uma conversa amigavel.\n` +
    `Faca UMA pergunta por vez, de forma natural.\n\n` +
    `${missingText}\n\n` +
    `REGRAS ABSOLUTAS:\n` +
    `- NUNCA de diagnostico medico.\n` +
    `- NUNCA prometa resultados especificos de procedimentos.\n` +
    `- NUNCA mencione precos a menos que o paciente pergunte (e mesmo assim, diga que os valores sao confirmados na consulta).\n` +
    `- Responda SOMENTE em portugues brasileiro.\n` +
    `- Seja empatetico e acolhedor.\n` +
    `${extra}\n\n` +
    `IMPORTANTE: Ao final da sua resposta, adicione um bloco JSON (que sera removido antes de enviar ao paciente) com as informacoes extraidas nesta mensagem:\n` +
    `\`\`\`json\n` +
    `{"bant_update": {"budget": false, "authority": false, "need": false, "timeline": false}, "lead_name": null, "procedure_interest": null}\n` +
    `\`\`\`\n` +
    `Preencha SOMENTE os campos que voce conseguiu extrair nesta mensagem. Mantenha false/null para o que nao foi mencionado.\n`
  );
}

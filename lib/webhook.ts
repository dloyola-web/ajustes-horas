export async function triggerN8nWebhook(periodo: string, count: number): Promise<boolean> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK
  
  if (!webhookUrl) {
    console.error('NEXT_PUBLIC_N8N_WEBHOOK is not defined in environment variables')
    return false
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'procesar_ajustes', periodo, count }),
    })
    
    if (!res.ok) {
      throw new Error(`Webhook failed with status: ${res.status}`)
    }
    
    return true
  } catch (error) {
    console.error('Error triggering n8n webhook:', error)
    return false
  }
}

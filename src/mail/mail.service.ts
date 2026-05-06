import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

export interface OrderMailData {
  customerName: string
  customerEmail: string
  customerPhone: string
  items: { name: string; quantity: number; price: number; variant?: string }[]
  total: number
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST')
    const user = config.get<string>('SMTP_USER')
    const pass = config.get<string>('SMTP_PASS')

    if (host && host !== 'dummy' && user && user !== 'dummy') {
      const port = Number(config.get('SMTP_PORT') ?? 587)
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
      this.logger.log(`[Mail] Transporter creado — host=${host} port=${port} user=${user}`)
    } else {
      this.logger.warn(`[Mail] Transporter NO creado — SMTP_HOST=${host} SMTP_USER=${user}`)
    }
  }

  private async send(to: string, subject: string, html: string) {
    const from = this.config.get<string>('SMTP_FROM') ?? 'noreply@7m-merchandising.com'

    if (!this.transporter) {
      this.logger.log(`[DEV] Email a ${to} | Asunto: ${subject}`)
      this.logger.log(`[DEV] ${html.replace(/<[^>]+>/g, ' ')}`)
      return
    }

    try {
      const info = await this.transporter.sendMail({ from, to, subject, html })
      this.logger.log(`[Mail] Enviado a ${to} | messageId=${info.messageId}`)
    } catch (err) {
      this.logger.error(`[Mail] Error enviando a ${to}: ${(err as Error).message}`)
      throw err
    }
  }

  async sendOrderToAdmin(adminEmail: string, data: OrderMailData) {
    const itemRows = data.items
      .map(
        (i) =>
          `<tr><td>${i.name}${i.variant ? `<br><small style="color:#666">${i.variant}</small>` : ''}</td><td>${i.quantity}</td><td>$${(i.price * i.quantity).toFixed(2)}</td></tr>`,
      )
      .join('')

    const html = `
      <h2>Nuevo pedido recibido</h2>
      <p><strong>Cliente:</strong> ${data.customerName}</p>
      <p><strong>Email:</strong> ${data.customerEmail}</p>
      <p><strong>Teléfono:</strong> ${data.customerPhone}</p>
      <h3>Productos</h3>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p><strong>Total: $${data.total.toFixed(2)}</strong></p>
    `

    await this.send(adminEmail, `Nuevo pedido de ${data.customerName}`, html)
  }

  async sendOrderConfirmationToCustomer(data: OrderMailData) {
    const itemRows = data.items
      .map(
        (i) =>
          `<tr><td>${i.name}${i.variant ? `<br><small style="color:#666">${i.variant}</small>` : ''}</td><td>${i.quantity}</td><td>$${(i.price * i.quantity).toFixed(2)}</td></tr>`,
      )
      .join('')

    const html = `
      <h2>¡Gracias por tu pedido, ${data.customerName}!</h2>
      <h3>Resumen de tu pedido</h3>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p><strong>Total: $${data.total.toFixed(2)}</strong></p>
      <p style="margin-top:16px;">
        Nos pondremos en contacto con usted para coordinar método de pago y envío,
        el cual se cotizará por separado.
      </p>
    `

    await this.send(data.customerEmail, 'Confirmación de pedido — 7M Merchandising', html)
  }
}

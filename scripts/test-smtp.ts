import * as nodemailer from 'nodemailer'
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
  const host = process.env.SMTP_HOST!
  const port = Number(process.env.SMTP_PORT ?? 465)
  const user = process.env.SMTP_USER!
  const pass = process.env.SMTP_PASS!
  const from = process.env.SMTP_FROM!

  console.log(`Conectando a ${host}:${port} secure=${port === 465}`)

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  try {
    await transporter.verify()
    console.log('✅ Conexión SMTP OK')
  } catch (err: any) {
    console.error('❌ Error de conexión SMTP:', err.message)
    return
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: user,
      subject: 'Test SMTP — 7M',
      html: '<p>Email de prueba enviado correctamente.</p>',
    })
    console.log('✅ Email enviado:', info.messageId)
  } catch (err: any) {
    console.error('❌ Error al enviar:', err.message)
  }
}

main()

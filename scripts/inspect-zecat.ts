import axios from 'axios'
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
  const client = axios.create({
    baseURL: process.env.ZECAT_BASE_URL,
    headers: {
      Authorization: `Bearer ${process.env.ZECAT_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  })

  const res = await client.get('/family', { params: { page: 1, limit: 3 } })
  const data = res.data
  console.log('=== CLAVES RAÍZ /family ===')
  console.log(Object.keys(data))
  const families = Array.isArray(data) ? data : data.families ?? data.data ?? []
  if (families.length) {
    console.log('\n=== CLAVES DE UNA FAMILIA ===')
    console.log(Object.keys(families[0]))
    console.log('\n=== PRIMER FAMILIA (JSON) ===')
    console.log(JSON.stringify(families[0], null, 2))
  }
}

main().catch(console.error)

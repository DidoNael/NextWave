const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.user.count()
  const orgs = await prisma.organization.count()
  console.log(JSON.stringify({ users, orgs }))
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())

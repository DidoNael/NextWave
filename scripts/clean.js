const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  // Deletar usuários primeiro (FK constraint)
  const u = await prisma.user.deleteMany()
  console.log('Users deletados:', u.count)
  const o = await prisma.organization.deleteMany()
  console.log('Orgs deletadas:', o.count)
  const countU = await prisma.user.count()
  const countO = await prisma.organization.count()
  console.log(JSON.stringify({ users: countU, orgs: countO }))
}
main().catch(console.error).finally(() => prisma.$disconnect())

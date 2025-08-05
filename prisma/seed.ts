import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create the initial survey
  const survey = await prisma.survey.create({
    data: {
      title: 'Lounge Design Feedback',
      question: 'Do you like the new lounge design?',
      isActive: true,
      options: {
        create: [
          {
            text: 'Love it! 😍',
            displayOrder: 1
          },
          {
            text: 'It\'s good 👍',
            displayOrder: 2
          },
          {
            text: 'Neutral 😐',
            displayOrder: 3
          },
          {
            text: 'Not a fan 👎',
            displayOrder: 4
          }
        ]
      }
    },
    include: {
      options: true
    }
  })

  console.log('Created survey:', survey)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
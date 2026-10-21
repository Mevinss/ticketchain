import { deploy } from './ethers-lib'

(async () => {
  try {
    const result = await deploy('TicketChain', [])
    console.log(`TicketChain deployed at: ${await result.getAddress()}`)
  } catch (e) {
    console.log(e.message)
  }
})()

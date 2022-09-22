const map = [
  ["1", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["3", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["4", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["10", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["11", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["12", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["25", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["28", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["42", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["5", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["56", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["69", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["82", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["83", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["100", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["106", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["111", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["122", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["123", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["137", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["246", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["288", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["300", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["336", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["338", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["588", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["592", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["595", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["686", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["787", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["1001", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["1008", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["1088", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["1284", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["1285", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["1287", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["1984", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["2001", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["2008", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["4002", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["4918", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["4919", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["7341", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["8217", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["9000", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["9001", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["10000", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["10001", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["11437", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["12357", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["42161", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["42170", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["42220", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["43114", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["47805", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["71401", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["73799", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["80001", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["200101", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["200202", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["333999", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["421611", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["421613", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["1313161554", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["1313161555", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["1666600000", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["1666700000", "0x998739BFdAAdde7C933B942a68053933098f9EDa"],
  ["11297108099", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
  ["11297108109", "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761"],
];

export default map;

const map = [
  ["1", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["3", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["4", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["5", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["10", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["11", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["12", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["25", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["28", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["42", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["56", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["69", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["82", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["83", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["100", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["106", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["111", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["122", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["123", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["137", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["246", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["288", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["300", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["336", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["338", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["588", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["592", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["595", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["686", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["787", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["1001", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["1008", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["1088", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["1284", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["1285", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["1287", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["1984", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["2001", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["2008", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["4002", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["4918", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["4919", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["7341", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["8217", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["9000", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["9001", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["10000", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["10001", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["11437", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["12357", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["42161", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["42170", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["42220", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["43114", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["47805", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["71401", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["73799", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["80001", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["200101", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["200202", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["333999", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["421611", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["421613", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["1313161554", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["1313161555", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["1666600000", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["1666700000", "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B"],
  ["11297108099", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
  ["11297108109", "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D"],
];

export default map;

const { ApolloServer, gql } = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法

// 1. 在假資料中補充朋友資訊
const users = [
    { id: 1, name: 'Fong', age: 23, height:170.0,weight:80.6, friendIds: [2, 3] },
    { id: 2, name: 'Kevin', age: 40,height:185.3,weight:75.4, friendIds: [1] },
    { id: 3, name: 'Mary', age: 18,height:165.2,weight:64.7, friendIds: [1] }
  ];


// The GraphQL schema
// 2. 在 Schema 添加新 fields
const typeDefs = gql`
  # Enum Type 為一種特殊的 Scalar Type ，使用時只能出現裡面有定義到的值且不需要加引號
  # 進入 JavaSript 中使用時，會轉為 String 格式
  """
  高度單位
  """
  enum HeightUnit {
    "公尺"
    METRE
    "公分"
    CENTIMETRE
    "英尺 (1 英尺 = 30.48 公分)"
    FOOT
  }
  
  """
  重量單位
  """
  enum WeightUnit {
    "公斤"
    KILOGRAM
    "公克"
    GRAM
    "磅 (1 磅 = 0.45359237 公斤)"
    POUND
  }

  """
  使用者
  """
  type User {
    "識別碼"
    id: ID
    "名字"
    name: String
    "年齡"
    age: Int
    "身高 (預設為 CENTIMETRE)"
    height(unit: HeightUnit = CENTIMETRE): Float
    "體重 (預設為 KILOGRAM)"
    weight(unit: WeightUnit = KILOGRAM): Float
    "朋友們"
    friends: [User]
  }

  type Query {
    "A simple type for getting started!"
    hello: String
    "取得當下使用者"
    me: User
    "取得所有使用者"
    users: [User]
    "取得特定 user (name 為必填)"
    user(name: String!): User
  }
`;

// A map of functions which return data for the schema.
const resolvers = {
    Query: {
      hello: () => 'world',
      me: () => users[0],
      // 3-1 在 `Query` 裡新增 `users`
      users: () => users,
      // 對應到 Schema 的 Query.user
      user: (root, args, context) => {
        // 取出參數。因為 name 為 non-null 故一定會有值。
        const { name } = args;
        return users.find(user => user.name === name);
      }
    },
    // 3-2 新增 `User` 並包含 `friends` 的 field resolver
    User: {
      // 每個 Field Resolver 都會預設傳入三個參數，
      // 分別為上一層的資料 (即 user)、參數 (下一節會提到) 以及 context (全域變數)
      friends: (parent, args, context) => {
        // 從 user 資料裡提出 friendIds
        const { friendIds } = parent;
        // Filter 出所有 id 出現在 friendIds 的 user
        return users.filter(user => friendIds.includes(user.id));
      },
      // 對應到 Schema 的 User.height
      height: (parent, args) => {
        const { unit } = args;
        // 可注意到 Enum type 進到 javascript 就變成了 String 格式
        // 另外支援 default 值 CENTIMETRE
        if (!unit || unit === "CENTIMETRE") return parent.height;
        else if (unit === "METRE") return parent.height / 100;
        else if (unit === "FOOT") return parent.height / 30.48;
        throw new Error(`Height unit "${unit}" not supported.`);
      },
      // 對應到 Schema 的 User.weight
      weight: (parent, args, context) => {
        const { unit } = args;
        // 支援 default 值 KILOGRAM
        if (!unit || unit === "KILOGRAM") return parent.weight;
        else if (unit === "GRAM") return parent.weight * 100;
        else if (unit === "POUND") return parent.weight / 0.45359237;
        throw new Error(`Weight unit "${unit}" not supported.`);
      }
    }
  };


// 初始化 Web Server ，需傳入 typeDefs (Schema) 與 resolvers (Resolver)
const server = new ApolloServer({
  // Schema 部分
  typeDefs,
  // Resolver 部分
  resolvers
});

// 啟動 Server
server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});
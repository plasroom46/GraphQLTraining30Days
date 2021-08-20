const { ApolloServer, gql } = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法

// GraphQL Schema 定義
const typeDefs = gql`
interface Animal {
    name: String
  }
  
  type Bird implements Animal {
    name: String
    "翅膀展開長度"
    wingSpanLength: Int
  }
  
  type Monkey implements Animal {
    name: String
    "手臂展開長度"
    armSpanLength: Int
  }
  
  type Query {
    animal(name: String): Animal
    animals: [Animal]
  }
`;

const animals = [
    { name: 'Chiken Litte', wingSpanLength: 10 },
    { name: 'Goku', armSpanLength: 20 },
    { name: 'King Kong', armSpanLength: 200 }
  ];



// Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
  Animal: {
    // 一定要實作這一個特殊 field
    __resolveType(obj, context, info) {
      // obj 為該 field 得到的資料
      if (obj.wingSpanLength) {
        // 回傳相對應得 Object type 名稱
        return 'Bird';
      }

      if (obj.armSpanLength) {
        return 'Monkey';
      }

      return null;
    }
  },
  Query: {
    animal: (root, { name }) => animals.find(animal => animal.name === name),
    animals: () => animals
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
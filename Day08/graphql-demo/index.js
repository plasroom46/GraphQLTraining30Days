const { ApolloServer, gql } = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法

// 在假資料中補充朋友資訊
const users = [
    { id: 1, name: 'Fong', age: 23, height:170.0,weight:80.6, friendIds: [2, 3] },
    { id: 2, name: 'Kevin', age: 40,height:185.3,weight:75.4, friendIds: [1] },
    { id: 3, name: 'Mary', age: 18,height:165.2,weight:64.7, friendIds: [1] }
  ];

const posts = [
  { id: 1, authorId: 1, title: "Hello World!", content: "This is my first post.", likeGiverIds: [2] },
  { id: 2, authorId: 2, title: "Good Night", content: "Have a Nice Dream =)", likeGiverIds: [2, 3] },
  { id: 3, authorId: 1, title: "I Love U", content: "Here's my second post!", likeGiverIds: [] },
];


// The GraphQL schema
// 在 Schema 添加新 fields
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
    # 使用 Type System Directives 標示 Deprecated 
    weight(unit: WeightUnit = KILOGRAM): Float @deprecated (reason: "It's secret")
    "朋友們"
    friends: [User]
    posts:[Post]
  }

  """
  貼文
  """
  type Post {
    "識別碼"
    id: ID!
    "作者"
    author: User
    "標題"
    title: String
    "內容"
    content: String
    "按讚者"
    likeGivers: [User]
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

  # Input Object Type
  input AddPostInput {
    title: String!
    content: String
  }

  # Mutation 定義
  type Mutation {
    "新增貼文"
    addPost(input: AddPostInput!): Post
    "貼文按讚 (收回讚)"
    likePost(postId: ID!): Post
  }
`;


// Helper Functions
const findUserById = id => users.find(user => user.id === id);
const findUserByName = name => users.find(user => user.name === name);
const filterPostsByAuthorId = authorId =>
  posts.filter(post => post.authorId === authorId);

const meId = 1;
const findPostById = id => posts.find(post => post.id === id);


// A map of functions which return data for the schema.
// 1. 新增 User.posts field Resovler
// 2. 新增 Post Type Resolver 及底下的 field Resolver
const resolvers = {
    Query: {
      hello: () => 'world',
      me: () => users[0],
      // 在 `Query` 裡新增 `users`
      users: () => users,
      // 對應到 Schema 的 Query.user
      user: (root, args, context) => {
        // 取出參數。因為 name 為 non-null 故一定會有值。
        const { name } = args;
        return users.find(user => user.name === name);
      },
    },
    // 新增 `User` 並包含 `friends` 的 field resolver
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
      },
      // 1. User.parent field resolver, 回傳屬於該 user 的 posts
      posts: (parent, args, context) => {
        // parent.id 為 userId
        return filterPostsByAuthorId(parent.id);
      }
    },
    // 2. Post type resolver
    Post: {
      // 2-1. parent 為 post 的資料，透過 post.likeGiverIds 連接到 users
      likeGivers: (parent, args, context) => {
        return parent.likeGiverIds.map(id => findUserById(id));
      },
      // 2-2. parent 為 post 的資料，透過 post.author
      author: (parent, args, context) => {
        return findUserById(parent.authorId);
      }
    },
    // Mutation Type Resolver
    Mutation : {
      // 需注意！args 打開後第一層為 input ，再進去一層才是 title, content
      addPost: (root, args, context) => {
        const { input } = args;
        const { title, content } = input;
        // 新增 post
        posts.push({
          id: posts.length + 1,
          authorId: meId,
          title,
          content,
          likeGivers: []
        });
        // 回傳新增的那篇 post
        return posts[posts.length - 1];
      },
      likePost: (root, args, context) => {
        const { postId } = args;
        const post = findPostById(postId);
        if (!post) throw new Error(`Post ${psotId} Not Exists`);
  
        if (post.likeGiverIds.includes(meId)) {
          // 如果已經按過讚就收回
          const index = post.likeGiverIds.findIndex(v => v === userId);
          post.likeGiverIds.splice(index, 1);
        } else {
          // 否則就加入 likeGiverIds 名單
          post.likeGiverIds.push(meId);
        }
        return post;
      },
    },
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
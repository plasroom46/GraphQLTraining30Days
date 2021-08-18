const { ApolloServer, gql } = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法

// Mock Data & Field Resolver
const users = [
  {
    id: 1,
    email: 'fong@test.com',
    password: '$2b$04$wcwaquqi5ea1Ho0aKwkZ0e51/RUkg6SGxaumo8fxzILDmcrv4OBIO', // 123456
    name: 'Fong',
    age: 23,
    friendIds: [2, 3]
  },
  {
    id: 2,
    email: 'kevin@test.com',
    password: '$2b$04$uy73IdY9HVZrIENuLwZ3k./0azDvlChLyY1ht/73N4YfEZntgChbe', // 123456
    name: 'Kevin',
    age: 40,
    friendIds: [1]
  },
  {
    id: 3,
    email: 'mary@test.com',
    password: '$2b$04$UmERaT7uP4hRqmlheiRHbOwGEhskNw05GHYucU73JRf8LgWaqWpTy', // 123456
    name: 'Mary',
    age: 18,
    friendIds: [1]
  }
];

const posts = [
  {
    id: 1,
    authorId: 1,
    title: 'Hello World',
    body: 'This is my first post',
    likeGiverIds: [1, 2],
    createdAt: '2018-10-22T01:40:14.941Z'
  },
  {
    id: 2,
    authorId: 2,
    title: 'Nice Day',
    body: 'Hello My Friend!',
    likeGiverIds: [1],
    createdAt: '2018-10-24T01:40:14.941Z'
  }
];


// GraphQL Schema 定義
const typeDefs = gql`
  """
  使用者
  """
  type User {
    "識別碼"
    id: ID!
    "帳號 email"
    email: String!
    "名字"
    name: String
    "年齡"
    age: Int
    "朋友"
    friends: [User]
    "貼文"
    posts: [Post]
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
    body: String
    "按讚者"
    likeGivers: [User]
    "建立時間 (ISO 格式)"
    createdAt: String
  }
  # Query Type Schema
  type Query {
    "測試用 Hello World"
    hello: String
    "取得目前使用者"
    me: User
    "取得所有使用者"
    users: [User]
    "依照名字取得特定使用者"
    user(name: String!): User
    "取得所有貼文"
    posts: [Post]
    "依照 id 取得特定貼文"
    post(id: ID!): Post
  }

  # Mutation Type Schema
  input UpdateMyInfoInput {
    name: String
    age: Int
  }
  
  # 3-2. Login - Schema
  type Token {
    token: String!
  }

  input AddPostInput {
    title: String!
    body: String
  }
  
  # 3-3. Mutation 分開可能需要使用命名，否則在網頁 Demo 輸入會不知道要找哪個 Mutation，最終導致無結果出現
  type Mutation {
    updateMyInfo(input: UpdateMyInfoInput!): User
    addFriend(userId: ID!): User
    addPost(input: AddPostInput!): Post
    likePost(postId: ID!): Post
    # 3-1. Register - Schema
    "註冊。 email 與 passwrod 必填"
    signUp(name: String, email: String!, password: String!): User
    # 3-2. Login - Schema
    "登入"
    login (email: String!, password: String!): Token
  } 
`;

// 3-1. Register - Resolver
// 引入外部套件
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 定義 bcrypt 加密所需 saltRounds 次數
const SALT_ROUNDS = 2;
// 定義 jwt 所需 secret (可隨便打)
const SECRET = 'just_a_random_secret';


// helper functions
const filterPostsByUserId = userId =>
  posts.filter(post => userId === post.authorId);

const filterUsersByUserIds = userIds =>
  users.filter(user => userIds.includes(user.id));
  
const findUserByUserId = userId => users.find(user => user.id === Number(userId));

// Query Type Resolver
const findUserByName = name => users.find(user => user.name === name);
const findPostByPostId = postId => posts.find(post => post.id === Number(postId));

// Mutation Type Resolver
const updateUserInfo = (userId, data) =>
  Object.assign(findUserByUserId(userId), data);

const addPost = ({ authorId, title, body }) =>
  (posts[posts.length] = {
    id: posts[posts.length - 1].id + 1,
    authorId,
    title,
    body,
    likeGiverIds: [],
    createdAt: new Date().toISOString()
  });

const updatePost = (postId, data) =>
  Object.assign(findPostByPostId(postId), data);

// 3-1. Register - Resolver
const hash = text => bcrypt.hash(text, SALT_ROUNDS);

const addUser = ({ name, email, password }) => (
  users[users.length] = {
    id: users[users.length - 1].id + 1,
    name,
    email,
    password
  }
);

// 3-2. Login - Resolver
const createToken = ({ id, email, name }) => jwt.sign({ id, email, name }, SECRET, {
  expiresIn: '1d'
});

// Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
  // Query Type Resolver
  Query: {
    hello: () => "world",
    // 3-3. Context Setup
    me: (root, args, { me }) => {
      if (!me) throw new Error ('Plz Log In First');
      return findUserByUserId(me.id)
    },
    users: () => users,
    user: (root, { name }, context) => findUserByName(name),
    posts: () => posts,
    post: (root, { id }, context) => findPostByPostId(id)
  },
  User: {
    posts: (parent, args, context) => filterPostsByUserId(parent.id),
    friends: (parent, args, context) => filterUsersByUserIds(parent.friendIds || [])
  },
  Post: {
    author: (parent, args, context) => findUserByUserId(parent.authorId),
    likeGivers: (parent, args, context) =>
      filterUsersByUserIds(parent.likeGiverIds)
  },
  // Mutation Type Resolver
  // 3-3. Mutation 分開可能需要使用命名，否則在網頁 Demo 輸入會不知道要找哪個 Mutation，最終導致無結果出現
  Mutation: {
    updateMyInfo: (parent, { input }, { me }) => {
      if (!me) throw new Error ('Plz Log In First');
      // 過濾空值
      const data = ["name", "age"].reduce(
        (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
        {}
      );

      return updateUserInfo(me.id, data);
    },
    addFriend: (parent, { userId }, { me: { id: meId } }) => {
      if (!me) throw new Error ('Plz Log In First');
      const me = findUserByUserId(meId);
      if (me.friendIds.include(userId))
        throw new Error(`User ${userId} Already Friend.`);

      const friend = findUserByUserId(userId);
      const newMe = updateUserInfo(meId, {
        friendIds: me.friendIds.concat(userId)
      });
      updateUserInfo(userId, { friendIds: friend.friendIds.concat(meId) });

      return newMe;
    },
    addPost: (parent, { input }, { me }) => {
      if (!me) throw new Error ('Plz Log In First');
      const { title, body } = input;
      return addPost({ authorId: me.id, title, body });
    },
    likePost: (parent, { postId }, { me }) => {
      if (!me) throw new Error ('Plz Log In First');

      const post = findPostByPostId(postId);

      if (!post) throw new Error(`Post ${postId} Not Exists`);

      if (!post.likeGiverIds.includes(postId)) {
        return updatePost(postId, {
          likeGiverIds: post.likeGiverIds.concat(me.id)
        });
      }
      return updatePost(postId, {
        likeGiverIds: post.likeGiverIds.filter(id => id === me.id)
      });
    },
    // 3-1. Register - Resolver
    signUp: async (root, { name, email, password }, context) => {
      // 1. 檢查不能有重複註冊 email
      const isUserEmailDuplicate = users.some(user => user.email === email);
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

      // 2. 將 passwrod 加密再存進去。非常重要 !!
      const hashedPassword = await hash(password, SALT_ROUNDS);
      // 3. 建立新 user
      return addUser({ name, email, password: hashedPassword });
    },
    // 3-2. Login - Resolver
    login: async (root, { email, password }, context) => {
      // 1. 透過 email 找到相對應的 user
      const user = users.find(user => user.email === email);
      if (!user) throw new Error('Email Account Not Exists');

      // 2. 將傳進來的 password 與資料庫存的 user.password 做比對
      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) throw new Error('Wrong Password');

      // 3. 成功則回傳 token
      return { token: await createToken(user) };
    }
  }
};

// 初始化 Web Server ，需傳入 typeDefs (Schema) 與 resolvers (Resolver)
const server = new ApolloServer({
  // Schema 部分
  typeDefs,
  // Resolver 部分
  resolvers,

  // 3-3. Context Setup
  context: async ({ req }) => {
    // 1. 取出
    const token = req.headers['x-token'];
    if (token) {
      try {
        // 2. 檢查 token + 取得解析出的資料
        const me = await jwt.verify(token, SECRET);
        // 3. 放進 context
        return { me };
      } catch (e) {
        throw new Error('Your session expired. Sign in again.');
      }
    }
    // 如果沒有 token 就回傳空的 context 出去
    return {};
  }
});

// 啟動 Server
server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});
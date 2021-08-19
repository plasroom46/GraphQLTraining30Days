// 1-1. 使用 .env 檔案
require('dotenv').config()

// 引入外部套件
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 定義 bcrypt 加密所需 saltRounds 次數
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);
// 定義 jwt 所需 secret (可隨便打)
const SECRET = process.env.SECRET;

// 4-1. 檢查有無認證 isAuthenticated
const { ApolloServer, gql, ForbiddenError } = require('apollo-server');
// ApolloServer: 讓我們啟動 server 的 class ，不但實作許多 GraphQL 功能也提供 web application 的功能 (背後使用 express)
// gql: template literal tag, 讓你在 Javascript 中使用 GraphQL 語法


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
    # 4-2. 檢查是否作者 isPostAuthor ?
    "刪貼文"
    deletePost(postId: ID!): Post
  } 
`;

// 3-1. Register - Resolver
// helper functions


// 4-1. 檢查有無認證 isAuthenticated
const isAuthenticated = resolverFunc => (parent, args, context) => {
  if (!context.me) throw new ForbiddenError('Not logged in.');
  return resolverFunc.apply(null, [parent, args, context]);
  };

const isPostAuthor = resolverFunc => (parent, args, context) => {
  const { postId } = args;
  const { me, postModel } = context
  const isAuthor = postModel.findPostByPostId(postId).authorId === me.id;
  if (!isAuthor) throw new ForbiddenError('Only Author Can Delete this Post');
  return resolverFunc.applyFunc(parent, args, context);
  }
    
    // 1-2. 將環境變數加入 context 中
    const hash = (text, saltRounds) => bcrypt.hash(text, saltRounds)
    const createToken = ({ id, email, name }, secret) =>
    jwt.sign({ id, email, name }, secret, {
      expiresIn: '1d'
    })


// Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
  // Query Type Resolver
  Query: {
    hello: () => "world",
    // 3-3. Context Setup
    me: isAuthenticated((parent, args, { me, userModel }) => userModel.findUserByUserId(me.id)),
    users: (root, args, { userModel }) => userModel.getAllUsers(),
    user: (root, { name }, { userModel }) => userModel.findUserByName(name),
    posts: (root, args, { postModel }) => postModel.getAllPosts(),
    post: (root, { id }, { postModel }) => postModel.findPostByPostId(id)
  },
  User: {
    posts: (parent, args, { postModel }) => postModel.filterPostsByUserId(parent.id),
    friends: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.friendIds || [])
  },
  Post: {
    author: (parent, args, { userModel }) => userModel.findUserByUserId(parent.authorId),
    likeGivers: (parent, args, { userModel }) =>
    userModel.filterUsersByUserIds(parent.likeGiverIds)
  },
  // Mutation Type Resolver
  // 3-3. Mutation 分開可能需要使用命名，否則在網頁 Demo 輸入會不知道要找哪個 Mutation，最終導致無結果出現
  Mutation: {
    updateMyInfo: isAuthenticated((parent, { input }, { me,userModel }) => {
      // 過濾空值
      const data = ["name", "age"].reduce(
        (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
        {}
      );

      return userModel.updateUserInfo(me.id, data);
    }),
    addFriend: isAuthenticated((parent, { userId }, { me: { id: meId },userModel }) => {
      const me = userModel.findUserByUserId(meId);
      if (me.friendIds.include(userId))
        throw new Error(`User ${userId} Already Friend.`);

      const friend = userModel.findUserByUserId(userId);
      const newMe = userModel.updateUserInfo(meId, {
        friendIds: me.friendIds.concat(userId)
      });
      userModel.updateUserInfo(userId, { friendIds: friend.friendIds.concat(meId) });

      return newMe;
    }),
    addPost: isAuthenticated((parent, { input }, { me,postModel }) => {
      const { title, body } = input;
      return postModel.addPost({ authorId: me.id, title, body });
    }),
    likePost: isAuthenticated((parent, { postId }, { me,postModel }) => {

      const post = postModel.findPostByPostId(postId);

      if (!post) throw new Error(`Post ${postId} Not Exists`);

      if (!post.likeGiverIds.includes(postId)) {
        return postModel.updatePost(postId, {
          likeGiverIds: post.likeGiverIds.concat(me.id)
        });
      }
      return postModel.updatePost(postId, {
        likeGiverIds: post.likeGiverIds.filter(id => id === me.id)
      });
    }),
    // 3-1. Register - Resolver
    signUp: async (root, { name, email, password }, { saltRounds,userModel }) => {
      // 1. 檢查不能有重複註冊 email
      const isUserEmailDuplicate = userModel.getAllUsers().some(user => user.email === email);
      if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

      // 2. 將 passwrod 加密再存進去。非常重要 !!
      const hashedPassword = await hash(password, saltRounds)
      // 3. 建立新 user
      return userModel.addUser({ name, email, password: hashedPassword });
    },
    // 3-2. Login - Resolver
    login: async (root, { email, password }, { secret,userModel }) => {
      // 1. 透過 email 找到相對應的 user
      const user = userModel.getAllUsers().find(user => user.email === email);
      if (!user) throw new Error('Email Account Not Exists');

      // 2. 將傳進來的 password 與資料庫存的 user.password 做比對
      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) throw new Error('Wrong Password');

      // 3. 成功則回傳 token
      return { token: await createToken(user, secret) }
    },
    // 4-2. 檢查是否作者 isPostAuthor ?
    deletePost: isAuthenticated(
      isPostAuthor((root, { postId }, { me,postModel }) => postModel.deletePost(postId))),
  }
};

const { userModel, postModel } = require('./Models')

// 初始化 Web Server ，需傳入 typeDefs (Schema) 與 resolvers (Resolver)
const server = new ApolloServer({
  // Schema 部分
  typeDefs,
  // Resolver 部分
  resolvers,

  // 3-3. Context Setup
  context: async ({ req }) => {
    // 1. 取出
    const context = { secret: SECRET, saltRounds: SALT_ROUNDS,userModel,postModel };
    const token = req.headers['x-token'];
    if (token) {
      try {
        // 2. 檢查 token + 取得解析出的資料
        const me = await jwt.verify(token, SECRET);
        // 3. 放進 context
        return { ...context,me };
      } catch (e) {
        throw new Error('Your session expired. Sign in again.');
      }
    }
    // 如果沒有 token 就回傳空的 context 出去
    return context;
  }
});

// 啟動 Server
server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});
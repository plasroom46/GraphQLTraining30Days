const {
  gql,
  ForbiddenError,
  AuthenticationError
} = require('apollo-server')

const {SchemaDirectiveVisitor}=require('graphql-tools')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// Construct a schema, using GraphQL schema language

// GraphQL Schema 定義
const typeDefs = gql`

directive @isAuthenticated on FIELD_DEFINITION

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

# Query Type Schema
extend type Query {
  "取得目前使用者"
  me: User @isAuthenticated
  "取得所有使用者"
  users: [User]
  "依照名字取得特定使用者"
  user(name: String!): User
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


# 3-3. Mutation 分開可能需要使用命名，否則在網頁 Demo 輸入會不知道要找哪個 Mutation，最終導致無結果出現
extend type Mutation {
  updateMyInfo(input: UpdateMyInfoInput!): User
  addFriend(userId: ID!): User
  # 3-1. Register - Schema
  "註冊。 email 與 passwrod 必填"
  signUp(name: String, email: String!, password: String!): User
  # 3-2. Login - Schema
  "登入"
  login (email: String!, password: String!): Token
} 
`;

// helper functions
// 1-2. 將環境變數加入 context 中
const hash = (text, saltRounds) => bcrypt.hash(text, saltRounds)
const createToken = ({ id, email, name }, secret) =>
jwt.sign({ id, email, name }, secret, {
expiresIn: '1d'
})

// 4-1. 檢查有無認證 isAuthenticated
const isAuthenticated = resolverFunc => (parent, args, context) => {
  if (!context.me) throw new ForbiddenError('Not logged in.');
  return resolverFunc.apply(null, [parent, args, context]);
  };

class IsAuthenticatedDirective extends SchemaDirectiveVisitor {
visitFieldDefinition(field) {
  const { resolve = defaultFieldResolver } = field;
  field.resolve = async function(...args) {
    const context = args[2];
    // 檢查有沒有 context.me
    if (!context.me) throw new ForbiddenError('Not logged in~.');

    // 確定有 context.me 後才進入 Resolve Function
    const result = await resolve.apply(this, args);
    return result;
  };
}
}




// Resolvers 是一個會對照 Schema 中 field 的 function map ，讓你可以計算並回傳資料給 GraphQL Server
const resolvers = {
  // Query Type Resolver
  Query: {
    // 3-3. Context Setup
    // 這邊純做資料存取邏輯
    me: (root, args, { me, userModel }) => userModel.findUserByUserId(me.id),
    users: (root, args, { userModel }) => userModel.getAllUsers(),
    user: (root, { name }, { userModel }) => userModel.findUserByName(name),
  },
  User: {
    posts: (parent, args, { postModel }) => postModel.filterPostsByUserId(parent.id),
    friends: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.friendIds || [])
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
  }
};

module.exports = {
  typeDefs,
  resolvers,
  chemaDirectives: {
    // 一樣要記得放進 ApolloServer 中
    isAuthenticated: IsAuthenticatedDirective
  }
};
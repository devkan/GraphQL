import { ApolloServer, gql } from "apollo-server";
//const { ApolloServer, gql } = require("apollo-server");
// package.json에 "type": "module" 을 사용하지 않으면 const 방식으로 사용해야 한다.

// memory db ///////////////////////////
let boards = [
	{
		id: "1",
		title: "title1",
		content: "content1",
		userId: "1",
	},
	{
		id: "2",
		title: "title2",
		content: "content2",
		userId: "3",
	},
];

let users = [
	{
		id: "1",
		firstName: "Lee",
		lastName: "SM",
	},
	{
		id: "2",
		firstName: "Kim",
		lastName: "DU",
	},
];
////////////////////////////////////////

const typeDefs = gql`
	type User {
		id: ID!
		firstName: String!
		lastName: String!
		fullName: String!
	}
	type Board {
		id: ID!
		title: String!
		content: String!
		author: User
	}

	type Query {
		allUsers: [User!]!
		allBoards: [Board!]!
		board(id: ID!): Board
	}
	type Mutation {
		postBoard(title: String!, content: String, author: ID!): Board!
		deleteBoard(id: ID!): Boolean!
	}
`;
/*
graphql SDL(Schema definition language)를 사용하게 된다. `(백틴)을 사용해서 감싸야 한다.
graphql에서의 query는 rest api에서의 GET Request를 만드는 것과 같다.

GET /api/boards -> allBoards: [Board]
GET /api/board/:id -> board(id: ID): Board
rest api에는 URL variable이 있다면, graphql에는 argument가 있다.

## Mutation ############
Mutation(변화)를 하려면 POST request 같은 모든 것들을 Mutation type에 넣어준다.
즉, user가 데이타를 보내 디비 저장이나 변경등이 이루어진다면 mutate(변화)이 때문에 mutation type에 반드시 넣어줘야 한다.

POST /api/boards -> postBoard(title: String, content: String, author: ID): Board
title, content, author를 받아서 backend로 보내고, Board type으로 리턴을 받아온다는 것이다.

## Nullable ############
board(id: ID): Board 여기서 Board는 "Board | null" 이라는 뜻이다. 디폴트로 Board가 오거나 null이 올수 있다고 지정한 것이다.
즉, 모든 필드는 기본적으로 nullable이다. id값이 필수로 하고 싶으면 board(id: ID!): Board 로 해야 한다.
그럼 반드시 id값이 전달되어야 하는 것이다.
board(id: ID!): Board! 이건 Board가 반드시 리턴이 되어야 한다는 것이다. id를 보내면 반드시 그에 맞는 board가 리턴이 된다고 보장이 된다면 !를 붙여주면 된다.
allBoards: [Board!]! 는 [] 리스트가 반드시 리턴이 되어야 하고, 그 안에 Board형식이 반드시 있어야 한다는 것이다. null이나 이런게 list안에 있으면 안된다는 것이다.
*/

const resolvers = {
	Query: {
		allUsers() {
			console.log("all users called");
			return users;
		},
		allBoards() {
			return boards;
		},
		board(root, { id }) {
			// id는 board(id: ID): Board 에서 id라서 그대로 id를 사용해야 한다.
			return boards.find((board) => board.id === id);
		},
		// argument호출시 root를 무조건 첫번째 인자로 들어가야 한다. 그 다음이 argument이다. board(_, {id}){ 이런식으로 사용해도 된다.
	},
	Mutation: {
		postBoard(_, { title, author }) {
			const newBoard = {
				id: boards.length + 1,
				title,
			};
			boards.push(newBoard);
			return newBoard;
		},
		deleteBoard(root, { id }) {
			const board = boards.find((board) => board.id === id);
			if (!board) return false;
			boards = boards.filter((board) => board.id !== id);
			return true;
		},
	},
	User: {
		// firstName, lastName 는 root에서 가져온 값이다.
		fullName({ firstName, lastName }) {
			console.log("full name called");
			//console.log("root:", root);
			return `${firstName} ${lastName}`;
		},
	},
	Board: {
		author({ userId }) {
			console.log("author called :", userId);
			const user = users.find((user) => user.id === userId);

			if (!user) {
				return null; // author: User에서 !를 제거해야지 정상 작동한다.
			}
			return user;
		},
	},
/*
graphQL은 요청에 따라서 resolver의 Query의 allUsers()를 실행하고, 리턴값을 보내고 보니, fullName이 없다는 것을 알게 되고, 
다시 resolver를 이용해 User의 fullName이 있는지 찾으면서 User밑의 fullName()함수가 실행이 되게 되는 것이다. 
그러면서 root로 값을 찍어보면 이전에 받아온 상위 값이 저장이 된 상태이다.
그리고 그 root의 value 중에서 { firstName, lastName } 를 가져와 string형으로 만들어 반환을 하게 되는 것이다.
이처럼 root에는 부모의 value를 저장해서 가지고 있게 되는 것이다.

## Relationships ###
1번 : graphQL로 이렇게 호출이 되면 우선 allBoards로 접근해서 resolver에서 boards 를 리턴한다.
2번 : type Query에서 boards 타입을 Board로 지정되어 있다.
3번 : 그럼 type Board를 참조해 id, title, author를 출력하고 하는데, author 필드가 없다.
4번 : 그래서 resolver를 다시 체크해 보니 Board에 author()함수가 있어서 실행을 한다. 이때 Board에서 받아온 parent 데이타(root)의 userId를 인자값을 사용해 User 데이타에서 id와 비교해 User를 가져온다. 
5번 : 그리고 type User에서 fullName을 출력하려는데, 또 User에 fullName이 없다. (여기서는 위의 type resolver와 같은 방법으로 작동한다.)
6번 : 그래서 다시 resolver 또 뒤져서 User의 fullName()을 실행 시킨다. 이때 parent 데이타(root)에서 firstName, lastName을 가져와 하나의 String으로 반환한다.

*/
};
/*

*/

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
	console.log(`Running on ${url}`);
});

import express, { response } from 'express'
import { scrypt, randomBytes, randomUUID } from 'node:crypto'

const app = express()

const users = [{
	username: 'admin',
	name: 'Gustavo Alfredo Marín Sáez',
	password: '1b6ce880ac388eb7fcb6bcaf95e20083:341dfbbe86013c940c8e898b437aa82fe575876f2946a2ad744a0c51501c7dfe6d7e5a31c58d2adc7a7dc4b87927594275ca235276accc9f628697a4c00b4e01' // certamen123
}]
const todos = []

app.use(express.static('public'))

// Su código debe ir aquí...

// ============================================= MIDDLEWARES ===================================================
app.use(express.json());

const tokenMiddleware = (request, response, next) => {
	const token = request.headers['x-authorization'];
	if(!token){
		return response.status(401).json({ error: 'No ha proporcionado el token' });
	}

	const usuario = users.find(user => user.token === token);
	if(!usuario){
		return response.status(401).json({ error: 'Token no valido.' });
	}
	next();
}

// ============================================= FUNCION VALIDAR PASSWORD ======================================
const validarPassword = (password, hash) => {
	return new Promise((resolve, reject) => {
		const [salt, clave] = hash.split(':');
		scrypt(password, salt, 64, (error, key) => {
			if(error){
				reject(error);
			}
			resolve(key.toString('hex')===clave);
		});
	});

}

// ============================================= RUTAS DE LA API ===============================================
// ============================================= HELLO WORLD ===================================================
app.get('/api', (request, response) => {
	response.setHeader('Content-Type', 'text/plain');	
	response.setHeader('Cache-Control', 'no-store');
	response.status(200).send('Hello World!');
});

// ============================================= LOGIN =========================================================
app.post('/api/login', async (request, response) => {
	const { username, password } = request.body;

	if(typeof username !== 'string' || username === "") return response.status(400).send();
	if(typeof password !== 'string' || password === "") return response.status(400).send();

	const usuario = users.find(user => user.username === username);

	if(!usuario) return response.status(401).send();
		
	try{
		const sonIguales = await validarPassword(password, usuario.password);

		if(sonIguales){
			const token = randomBytes(48).toString('hex');
			usuario.token = token;

			response.setHeader('Content-Type', 'application/json');

			response.status(200).json({
				username: usuario.username,
				name: usuario.name,
				token: usuario.token
			} );
			
		}else{
			response.status(401).send();
		}
	}catch(error){
		response.status(500).json({ mensaje: 'Problema interno. Contacte al administrador.'} );
	}
});

// ============================================= LISTAR ITEMS ==================================================
app.get('/api/todos', tokenMiddleware, (request, response) => {
	let itemsTest = [
		{
			id: '9f445963-f18b-490b-91dc-4ecad2e1d449',
			title: 'Primer item',
			completed: false
		},
		{
			id: 'mh985963-f18b-490b-91dc-4ecad2e1d449',
			title: 'Segundo item',
			completed: false
		}
	];
	itemsTest.forEach(item => {
		todos.push(item);
	});

	response.setHeader('Content-Type', 'application/json');
	response.setHeader('Cache-Control', 'no-store');
	response.status(200).json(todos);
});

// ============================================= CREACION DE ITEM ==============================================
app.post('/api/todos/', tokenMiddleware, (request, response) => {
	const titulo = request.body.title;

	if(!titulo || typeof titulo !== 'string') return response.status(400).send();

	const randomId = () => {
		let randomValue;
		let existe = false;

		do{
			randomValue = randomUUID();
			existe = todos.find(item => item.id === randomValue);
		}while(existe);
		return randomValue;
	}

	const nuevoItem = {
		id: randomId(),
		title: titulo,
		completed: false
	}

	todos.push(nuevoItem)
	response.setHeader('Content-Type', 'application/json');
	return response.status(201).json(nuevoItem);
});

// ============================================= ACTUALIZACION DE ITEM =========================================
app.put('/api/todos/:id', tokenMiddleware, (request, response) => {
	const { id } = request.params;
	const { title, completed } = request.body;
	const indiceItem = todos.findIndex(item => item.id === id);

	if(indiceItem === -1) return response.status(404).send();

	if(completed !== undefined){
		if(typeof completed !== 'boolean') return response.status(400).send();
		todos[indiceItem].completed = completed;
	}

	if(title !== undefined){
		if(typeof title !== 'string' || title === '') return response.status(400).send();	
		todos[indiceItem].title = title;
	}

	response.setHeader('Content-Type', 'application/json')
	return response.status(200).json(todos[indiceItem]);
});

// ============================================= BORRADO DE ITEM ===============================================
app.delete('/api/todos/:id', tokenMiddleware, (request, response) => {
	const id = request.params.id;
	const indiceItem = todos.findIndex(item => item.id === id);

	if(indiceItem === -1) return response.status(404).send();
	todos.splice(indiceItem, 1);
	response.status(204).send();
});

// ... hasta aquí

export default app
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

// Middlewares.
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

//Crear hash de la contraseña (no es necesario para este caso ya que se usa el usuario de ejemplo.)
const hashPassword = (password, callback) =>{
	const salt = randomBytes(16).toString('hex');
	const keylen = 64;	// Longitu de la clave.

	scrypt(password, salt, keylen, (error, key) =>{
		if(error){
			callback(error);
		} 
		const hash = `${salt}:${key.toString('hex')}`;
		callback(null, hash);
	});
}


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

// Rutas.
app.get('/api', (request, response) => {
	response.setHeader('Content-Type', 'text/plain');	
	response.setHeader('Cache-Control', 'no-store');
	response.status(200).send('Hello World!');
});

app.post('/api/login', async (request, response) => {
	const { username, password } = request.body;

	if(typeof(username) !== 'string' || username === ""){
		return response.status(400).json({ error: 'Peticion mala (400)' });
	}

	const usuario = users.find(user => user.username === username);

	if(!usuario){
		return response.status(401).json({ error: 'No autorizado (401).'})
	}

	try{
		const sonIguales = await validarPassword(password, usuario.password);

		if(sonIguales){
			const token = randomBytes(48).toString('hex');
			usuario.token = token;

			response.status(200).json({
				username: usuario.username,
				name: usuario.name,
				token: usuario.token
			} );
			
		}else{
			response.status(401).json({ mensaje: 'Credenciales incorrectas (401)'} );
		}
	}catch(error){
		response.status(500).json({ mensaje: 'Problema en el servidor (500)'} );
	}


});

// LISTAR ITEMS.
app.get('/api/todos', tokenMiddleware, (request, response) => {
	const item ={
			id: 'sdfsjkddh223',
			title: 'Primer item',
			completed: false
	}
	todos.push(item);

	response.setHeader('Content-Type', 'application/json')
	response.status(200).json(todos);
});

// CREAR ITEM.
app.post('/api/todos/', tokenMiddleware, (request, response) => {
	const titulo = request.body.title;

	if(!titulo){
		return response.status(400).json({ message: 'Operacion incorrecta'} );
	}

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
	return response.status(201).json(nuevoItem);
});

// ACTUALIZAR ITEM.
app.put('/api/todos/:id', tokenMiddleware, (request, response) => {
	const { id } = request.params;
	const { title, completed } = request.body;
	const indiceItem = todos.findIndex(item => item.id === id);

	if(indiceItem === -1){
		return response.status(404);
	}

	if(completed !== undefined){
		if(typeof completed !== 'boolean') return response.status(400).send();
		todos[indiceItem].completed = completed;
	}

	if(title !== undefined){
		if(typeof title !== 'string' || title === '') return response.status(400).send();	
		todos[indiceItem].title = title;
	}

	return response.status(201).json(todos[indiceItem]);
});

// ... hasta aquí

export default app
const express = require('express');
const helmet = require('helmet');
const config = require('./config');
const loaders = require('./loaders');
const events = require('./scripts/events');
const errorHandler = require('./middlewares/errorHandler');

const {
    BlogsRoutes,
    CommentsRoutes,
    UsersRoutes,
    ReadinglistsRoutes,
} = require('./api-routes');

config();
loaders();
events();

const app = express();

app.use(express.json());
app.use(helmet());

app.use('/blogs', BlogsRoutes);
app.use('/comments', CommentsRoutes);
app.use('/users', UsersRoutes);
app.use('/readinglists', ReadinglistsRoutes);

app.use((req, res, next) => {
    const error = new Error('Endpoint is not available.');
    error.status = 404;
    next(error);
});

app.use(errorHandler);

app.listen(process.env.EXPRESS_APP_PORT, () => {
    console.log(`Server is running on port ${process.env.EXPRESS_APP_PORT}...`);
});

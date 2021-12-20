const httpStatus = require('http-status');
const uuid = require('uuid');
const eventEmitter = require('../scripts/events/eventEmitter');
const {
    insert,
    list,
    loginUser,
    modify,
    remove,
} = require('../services/Users');
const {
    removeBlogsForUser,
    listBlogsLikedByCurrentUser,
} = require('../services/Blogs');
const { removeCommentsForUser } = require('../services/Comments');
const { removeReadingListsForUser } = require('../services/Readinglists');
const {
    passwordToHash,
    comparePassword,
} = require('../scripts/utils/passwordUtil');
const { generateAccessToken } = require('../scripts/utils/tokenUtil');

const ApiError = require('../errors/ApiError');

const create = (req, res, next) => {
    req.body.password = passwordToHash(req.body.password);

    insert(req.body)
        .then((response) => {
            res.status(httpStatus.CREATED).send(response);
        })
        .catch((e) => {
            // checks for duplicate mails error too
            next(new ApiError(e.message));
        });
};

const update = (req, res, next) => {
    // get user info from auth middleware
    modify({ _id: req.userInfo?._id }, req.body)
        .then((updatedUser) => {
            res.status(httpStatus.OK).send(updatedUser);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });

    // TODOS: when user full_name changes, authors at blogs and comments should be changed too
};

const login = (req, res, next) => {
    const { email } = req.body;
    loginUser({ email: email })
        .then((user) => {
            if (!user)
                return next(
                    new ApiError('User not found', httpStatus.NOT_FOUND)
                );

            const passwordMatch = comparePassword(
                req.body.password,
                user.password
            );

            if (!passwordMatch)
                return next(
                    new ApiError(
                        'Password does not match',
                        httpStatus.NOT_FOUND
                    )
                );

            user = {
                ...user.toObject(),
                tokens: {
                    access_token: generateAccessToken(user),
                },
            };
            delete user.password;
            res.status(httpStatus.OK).send(user);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const getCurrentUserSessionInfo = (req, res) => {
    res.status(httpStatus.OK).send(req.userInfo);
};

const index = (req, res, next) => {
    list()
        .then((response) => {
            res.status(httpStatus.OK).send(response);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const resetPassword = (req, res, next) => {
    const new_password =
        uuid.v4()?.split('-')[0] || `usr-${new Date().getTime()}`;
    modify(
        { email: req.body.email },
        { password: passwordToHash(new_password) }
    )
        .then((updatedUser) => {
            if (!updatedUser)
                return next(
                    new ApiError('User not found', httpStatus.NOT_FOUND)
                );

            eventEmitter.emit('send_email', {
                to: updatedUser.email, // list of receivers
                subject: 'Password Reset Information', // Subject line
                html: `<h3> Important change in your user data </h3>
                <p> Your password has been reset. <br> new password is: ${new_password} </p>
                <br>
                <p> Please do not share with others </p>
                <br>
                <p> Best </p>
                <h3> from Friday Blog </h3>
                `, // html body
            });

            res.status(httpStatus.OK).send({
                message: 'Mail has been sent to user email',
            });
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const changePassword = (req, res, next) => {
    // this will send with SMS, plain password without hash
    const new_password = req.body.password;

    // the hashed password will be saved to DB
    req.body.password = passwordToHash(req.body.password);

    // get user info from auth middleware
    modify({ _id: req.userInfo._id }, req.body)
        .then((updatedUser) => {
            if (!updatedUser)
                return next(
                    new ApiError(
                        'User password has not been changed',
                        httpStatus.NOT_FOUND
                    )
                );

            if (req.userInfo.preferences.sendSMS) {
                eventEmitter.emit('send_sms', {
                    body: `Your password has been changed successfully. New password is ${new_password}`,
                    to: `+${req.userInfo.phoneNumber}`,
                });
            }

            res.status(httpStatus.OK).send(updatedUser);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

const deleteUser = (req, res, next) => {
    if (!req.params?.id) {
        return res.status(httpStatus.BAD_REQUEST).send({
            message: 'ID Info is missing',
        });
    }
    // get user id
    const { _id } = req.userInfo;
    // remove blogs written by user
    removeBlogsForUser(_id)
        .then((removedBlogs) => {
            console.log(removedBlogs);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });

    // remove comments posted by user
    removeCommentsForUser(_id)
        .then((removedComments) => {
            console.log(removedComments);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });

    // remove reading lists created by user
    removeReadingListsForUser(_id)
        .then((removedReadingLists) => {
            console.log(removedReadingLists);
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });

    // find blogs where blogs.likedByUsers array contains current user id

    listBlogsLikedByCurrentUser(_id)
        .then((blogs) => {
            // loop through each blog
            blogs.forEach((blog) => {
                // filter each blog so that deleted user does not exists in likedByUsers array
                blog.likedByUsers = blog.likedByUsers.filter(
                    (elem) => elem.user_id?.toString() !== _id
                );
                // save to db
                blog.save();
            });
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });

    // it is safe to remove user now
    remove(req.params?.id)
        .then((deletedUser) => {
            if (!deletedUser) {
                return next(
                    new ApiError(
                        'User id is not being removed',
                        httpStatus.NOT_FOUND
                    )
                );
            }
            res.status(httpStatus.OK).send({
                message: 'User has been removed',
            });
        })
        .catch((e) => {
            next(new ApiError(e.message));
        });
};

module.exports = {
    create,
    update,
    index,
    getCurrentUserSessionInfo,
    login,
    changePassword,
    deleteUser,
    resetPassword,
};

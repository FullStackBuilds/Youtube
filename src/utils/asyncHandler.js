// moduler and reusable functions known as higher order function
export const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            console.log("Error: ", error);
        }
    };
};
import User from "../models/User.model.js";

export const createUserService = async (
    data,
    createdByUser
) => {

    const {
        name,
        phone,
        email,
        role
    } = data;

    if (!name || !phone || !email) {
        throw new Error(
            "Name, phone and email are required"
        );
    }

    const requestRole = role || "user";

    // Staff can create only customers
    if (
        createdByUser.role === "staff" &&
        requestRole !== "user"
    ) {
        throw new Error(
            "Staff can only create users"
        );
    }

    // Admin can create customers or staff
    if (
        createdByUser.role === "admin" &&
        !["user", "staff"].includes(
            requestRole
        )
    ) {
        throw new Error(
            "Admin can only create users and staff"
        );
    }

    const existingUser =
        await User.findOne({ phone });

    if (existingUser) {
        throw new Error(
            "User with this phone number already exists"
        );
    }

    const user =
        await User.create({
            name,
            phone,
            email,
            role: requestRole,
            accountType: "manual",
            createdBy: createdByUser._id
        });

    return {
        message:
            `${requestRole} created successfully by ${createdByUser.role}`,

        data: {
            user
        }
    };
};


export const updateUserBYidService =
    async (
        id,
        data,
        updatedByUser
    ) => {

        const {
            name,
            phone,
            email,
            role,
            isBlocked
        } = data;


        /*
         * 1. Validate role change
         */

        if (role !== undefined) {

            // Staff cannot change role
            if (
                updatedByUser.role === "staff"
            ) {
                throw new Error(
                    "Staff cannot change user role"
                );
            }

            // Admin can assign only user/staff
            if (
                updatedByUser.role === "admin" &&
                !["user", "staff"].includes(role)
            ) {
                throw new Error(
                    "Invalid user role"
                );
            }
        }


        /*
         * 2. Find target user
         */

        const exist =
            await User
                .findById(id)
                .populate(
                    "createdBy",
                    "phone role"
                );

        if (!exist) {
            throw new Error(
                "User not found"
            );
        }


        /*
         * 3. Staff permission
         */

        if (
            updatedByUser.role === "staff"
        ) {

            // Staff can update only manual customers
            if (
                exist.accountType !== "manual"
            ) {
                throw new Error(
                    "Staff can only update manually created customers"
                );
            }


            // Customer must have a creator
            if (!exist.createdBy) {
                throw new Error(
                    "Staff can only update customers created by them"
                );
            }


            // Creator must be staff
            if (
                exist.createdBy.role !== "staff"
            ) {
                throw new Error(
                    "Staff can only update customers created by staff"
                );
            }


            // Customer must be created by
            // currently logged in staff
            if (
                exist.createdBy._id.toString() !==
                updatedByUser._id.toString()
            ) {
                throw new Error(
                    `You cannot update a customer created by another staff member "${exist.createdBy.phone}"`
                );
            }


            // Staff cannot change role
            if (
                role !== undefined
            ) {
                throw new Error(
                    "Staff cannot change user role"
                );
            }


            // Staff cannot block/unblock
            if (
                isBlocked !== undefined
            ) {
                throw new Error(
                    "Only admin can block or unblock users"
                );
            }
        }


        /*
         * 4. Check duplicate phone
         */

        if (
            phone !== undefined &&
            phone !== exist.phone
        ) {

            const phoneExists =
                await User.findOne({
                    phone,
                    _id: {
                        $ne: id
                    }
                });

            if (phoneExists) {
                throw new Error(
                    "Another user already exists with this phone number"
                );
            }
        }


        /*
         * 5. Prepare update data
         */

        const updateData = {};


        /*
         * Normal fields
         */

        if (name !== undefined) {
            updateData.name = name;
        }

        if (phone !== undefined) {
            updateData.phone = phone;
        }

        if (email !== undefined) {
            updateData.email = email;
        }


        /*
         * Only admin can change role
         */

        if (
            role !== undefined &&
            updatedByUser.role === "admin"
        ) {
            updateData.role = role;
        }


        /*
         * Only admin can block/unblock
         */

        if (
            isBlocked !== undefined &&
            updatedByUser.role === "admin"
        ) {
            updateData.isBlocked =
                isBlocked;
        }


        /*
         * 6. Update user
         */

        const user =
            await User.findByIdAndUpdate(
                id,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            );


        if (!user) {
            throw new Error(
                "User not found"
            );
        }


        /*
         * 7. Return
         */

        return {
            message:
                "User updated successfully",

            data: {
                user
            }
        };
    };

    export const getUsersService = async (query) => {

    const { phone } = query;

    const filter = {};

    if (phone) {
        filter.phone = {
            $regex: phone.trim(),
            $options: "i"
        };
    }

    const users = await User
        .find(filter)
        .select(
            "-__v"
        )
        .sort({
            createdAt: -1
        })
        .lean();

    return {
        message: "Users fetched successfully",
        data: {
            users,
            count: users.length
        }
    };
};

// export const updateUserBYidService = async (id,data,updatedByUser) => {
//     const { name, phone, email,role } = data;
//     if (role!== undefined) {
//         if (updatedByUser.role==="staff") {
//             throw new Error("staff can not change the role");
//         }
//         if (updatedByUser.role==="admin" && !["user","staff"].includes(role)) {
//             throw new Error("invalid roll");
//         }
//     };
    
//     const exist = await User.findById(id).populate("createdBy","phone role");
//       if (!exist) {
//         throw new Error("user not found");
//     }
//     if ( updatedByUser.role === "staff" &&    exist.createdBy &&exist.createdBy.role==="staff" && exist.createdBy._id.toString() !== updatedByUser._id.toString()) {
//         throw new Error(`you can not update an user who created by other staff "${exist.createdBy.phone}"`);
//     }
//      if (exist.createdBy.role === "staff" && exist.accountType!=="manual") {
//         throw new Error(`staff can only update the manually created costomers`);
//     }


//     const user = await User.findByIdAndUpdate(id,data);
  
// return {
//     message:"updated succefull",
//     data:{
//         user
//     }
// }

// }
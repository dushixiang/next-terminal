package service

import (
	"errors"
	"io/ioutil"
	"os"
	"path"

	"next-terminal/server/config"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

type StorageService struct {
	storageRepository  *repository.StorageRepository
	userRepository     *repository.UserRepository
	propertyRepository *repository.PropertyRepository
}

func NewStorageService(storageRepository *repository.StorageRepository, userRepository *repository.UserRepository, propertyRepository *repository.PropertyRepository) *StorageService {
	return &StorageService{storageRepository: storageRepository, userRepository: userRepository, propertyRepository: propertyRepository}
}

func (r StorageService) InitStorages() error {
	users := r.userRepository.FindAll()
	for i := range users {
		userId := users[i].ID
		_, err := r.storageRepository.FindByOwnerIdAndDefault(userId, true)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			err = r.CreateStorageByUser(&users[i])
			if err != nil {
				return err
			}
		}
	}

	drivePath := r.GetBaseDrivePath()
	storages := r.storageRepository.FindAll()
	for i := 0; i < len(storages); i++ {
		storage := storages[i]
		// 判断是否为遗留的数据：磁盘空间在，但用户已删除
		if storage.IsDefault {
			var userExist = false
			for j := range users {
				if storage.ID == users[j].ID {
					userExist = true
					break
				}
			}

			if !userExist {
				if err := r.DeleteStorageById(storage.ID, true); err != nil {
					return err
				}
			}
		}

		storageDir := path.Join(drivePath, storage.ID)
		if !utils.FileExists(storageDir) {
			if err := os.MkdirAll(storageDir, os.ModePerm); err != nil {
				return err
			}
			log.Infof("创建storage:「%v」文件夹: %v", storage.Name, storageDir)
		}
	}
	return nil
}

func (r StorageService) CreateStorageByUser(user *model.User) error {
	drivePath := r.GetBaseDrivePath()
	storage := model.Storage{
		ID:        user.ID,
		Name:      user.Nickname + "的默认空间",
		IsShare:   false,
		IsDefault: true,
		LimitSize: -1,
		Owner:     user.ID,
		Created:   utils.NowJsonTime(),
	}
	storageDir := path.Join(drivePath, storage.ID)
	if err := os.MkdirAll(storageDir, os.ModePerm); err != nil {
		return err
	}
	log.Infof("创建storage:「%v」文件夹: %v", storage.Name, storageDir)
	err := r.storageRepository.Create(&storage)
	if err != nil {
		return err
	}
	return nil
}

type File struct {
	Name    string         `json:"name"`
	Path    string         `json:"path"`
	IsDir   bool           `json:"isDir"`
	Mode    string         `json:"mode"`
	IsLink  bool           `json:"isLink"`
	ModTime utils.JsonTime `json:"modTime"`
	Size    int64          `json:"size"`
}

func (r StorageService) Ls(drivePath, remoteDir string) ([]File, error) {
	fileInfos, err := ioutil.ReadDir(path.Join(drivePath, remoteDir))
	if err != nil {
		return nil, err
	}

	var files = make([]File, 0)
	for i := range fileInfos {
		file := File{
			Name:    fileInfos[i].Name(),
			Path:    path.Join(remoteDir, fileInfos[i].Name()),
			IsDir:   fileInfos[i].IsDir(),
			Mode:    fileInfos[i].Mode().String(),
			IsLink:  fileInfos[i].Mode()&os.ModeSymlink == os.ModeSymlink,
			ModTime: utils.NewJsonTime(fileInfos[i].ModTime()),
			Size:    fileInfos[i].Size(),
		}

		files = append(files, file)
	}
	return files, nil
}

func (r StorageService) GetBaseDrivePath() string {
	return config.GlobalCfg.Guacd.Drive
}

func (r StorageService) DeleteStorageById(id string, force bool) error {
	drivePath := r.GetBaseDrivePath()
	storage, err := r.storageRepository.FindById(id)
	if err != nil {
		return err
	}
	if !force && storage.IsDefault {
		return errors.New("默认空间不能删除")
	}

	// 删除对应的本地目录
	if err := os.RemoveAll(path.Join(drivePath, id)); err != nil {
		return err
	}
	if err := r.storageRepository.DeleteById(id); err != nil {
		return err
	}
	return nil
}
